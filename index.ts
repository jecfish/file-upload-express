import * as express from 'express'
import * as multer from 'multer'
import * as cors from 'cors'
import * as fs from 'fs'
import * as path from 'path'
import * as Loki from 'lokijs'

// setup
const UPLOAD_PATH = './uploads';
const COLLECTION_NAME = 'images';
const upload = multer({ dest: `${UPLOAD_PATH}/` });
const db = new Loki('uploads/images.json', { persistenceMethod: 'fs' });


const loadCollection = function (colName, callback) {
    db.loadDatabase({}, () => {
        const _collection = db.getCollection(colName) || db.addCollection(colName);
        callback(_collection);
    });
}

// express
var app = express();
app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello World!');
})

app.post('/profile', upload.single('avatar'), (req, res) => {
    // req.file is the `avatar` file
    // req.body will hold the text fields, if there were any
    console.log(req.file, req.body)
    loadCollection(COLLECTION_NAME, col => {
        const data = col.insert(req.file);
        db.saveDatabase();
        res.send({ id: data.$loki, fileName: data.filename })
    })
})

app.post('/photos/upload', upload.array('photos', 12), (req, res) => {
    // req.files is array of `photos` files
    // req.body will contain the text fields, if there were any
    console.log(req.files, req.body)
    loadCollection(COLLECTION_NAME, col => {
        let data = [];
        (req.files as any).forEach(x => {
            data = data.concat(col.insert(x));
            db.saveDatabase();
        })
        res.send(data.map(x => ({ id: x.$loki, fileName: x.filename })))
    })

})

app.get('/images', (req, res) => {
    loadCollection(COLLECTION_NAME, col => {
        res.send(col.data);
    })
})

app.get('/images/:id', (req, res) => {
    loadCollection(COLLECTION_NAME, col => {
        const result = col.get(req.params.id);
        if (!result) res.send(404);
        res.setHeader('Content-Type', result.mimetype);
        fs.createReadStream(path.join(UPLOAD_PATH, result.filename)).pipe(res);
    })
})

app.listen(3000, function () {
    console.log('listening on port 3000!')
})