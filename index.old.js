var express = require('express')
var cors = require('cors')
// var del = require('del')
var multer = require('multer')
var bodyParser = require('body-parser')
var fs = require('fs')
var path = require('path')
var loki = require('lokijs');

// setup
const UPLOAD_PATH = './uploads';
var upload = multer({ dest: `${UPLOAD_PATH}/` });
var db = new loki('uploads/images.json', { persistenceMethod: 'fs' }); //{ adapter : new loki.LokiFsAdapter() });
const COL_NAME = 'images';

function loadCollection(colName, callback) {
    db.loadDatabase({}, function () {
        var _collection = db.getCollection(colName);

        if (!_collection) {
            console.log("Collection %s does not exit. Creating ...", colName);
            _collection = db.addCollection(colName);
        }

        callback(_collection);
    });
}

// express
var app = express();
// app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello World!');
})

app.post('/profile', upload.single('avatar'), (req, res) => {
    // req.file is the `avatar` file
    // req.body will hold the text fields, if there were any
    console.log(req.file, req.body)
    loadCollection(COL_NAME, col => {
        col.insert(req.file);
        db.saveDatabase();
        res.send({ id: req.file.$loki, fileName: req.file.filename })
    })
})

app.post('/photos/upload', upload.array('photos', 12), (req, res) => {
    // req.files is array of `photos` files
    // req.body will contain the text fields, if there were any
    console.log(req.files, req.body)
    loadCollection(COL_NAME, col => {
        req.files.forEach(x => {
            col.insert(x);
            db.saveDatabase();
        })      
        res.send(req.files.map(x => ({ id: x.$loki, fileName: x. filename })))
    })
    
})

app.get('/images', (req, res) => {
    loadCollection(COL_NAME, col => {
        res.send(col.data);
    })
})

app.get('/images/:id', (req, res) => {
    loadCollection(COL_NAME, col => {
        const result = col.get(req.params.id);
        if (!result) res.send(404);
        res.setHeader('Content-Type', result.mimetype);
        fs.createReadStream(path.join(UPLOAD_PATH, result.filename)).pipe(res);
    })
})

app.listen(3000, function () {
    console.log('Example app listening on port 3000!')
})