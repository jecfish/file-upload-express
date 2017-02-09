import * as express from 'express'
import * as multer from 'multer'
import * as cors from 'cors'
import * as fs from 'fs'
import * as path from 'path'
import * as Loki from 'lokijs'

// setup
const UPLOAD_PATH = './uploads';
const COLLECTION_NAME = 'images';
const upload = multer({
    dest: `${UPLOAD_PATH}/`,
    fileFilter: function (req, file, cb) {
        // accept image only
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});
const db = new Loki('uploads/images.json', { persistenceMethod: 'fs' });

// utils
const loadCollection = function (colName): Promise<LokiCollection<any>> {
    return new Promise(resolve => {
        db.loadDatabase({}, () => {
            const _collection = db.getCollection(colName) || db.addCollection(colName);
            resolve(_collection);
        })
    });
}

// express
var app = express();
app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello World!');
})

app.post('/profile', upload.single('avatar'), async (req, res) => {
    const col = await loadCollection(COLLECTION_NAME);
    const data = col.insert(req.file);

    db.saveDatabase();
    res.send({ id: data.$loki, fileName: data.filename });
})

app.post('/photos/upload', upload.array('photos', 12), async (req, res) => {
    const col = await loadCollection(COLLECTION_NAME)
    let data = [];

    (req.files as any).forEach(x => {
        data = data.concat(col.insert(x));
        db.saveDatabase();
    })
    res.send(data.map(x => ({ id: x.$loki, fileName: x.filename })));
})

app.get('/images', async (req, res) => {
    const col = await loadCollection(COLLECTION_NAME);

    res.send(col.data);
})

app.get('/images/:id', async (req, res) => {
    const col = await loadCollection(COLLECTION_NAME);
    const result = col.get(req.params.id);

    if (!result) res.send(404);
    res.setHeader('Content-Type', result.mimetype);
    fs.createReadStream(path.join(UPLOAD_PATH, result.filename)).pipe(res);
})

app.listen(3000, function () {
    console.log('listening on port 3000!');
})