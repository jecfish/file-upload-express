import * as express from 'express'
import * as multer from 'multer'
import * as cors from 'cors'
import * as fs from 'fs'
import * as path from 'path'
import * as Loki from 'lokijs'
import { imageFilter, loadCollection, cleanFolder } from './utils';

// setup
const DB_NAME = 'db.json';
const COLLECTION_NAME = 'images';
const UPLOAD_PATH = 'uploads';
const upload = multer({ dest: `${UPLOAD_PATH}/`, fileFilter: imageFilter });
const db = new Loki(`${UPLOAD_PATH}/${DB_NAME}`, { persistenceMethod: 'fs' });

// optional: clean all data before start
// cleanFolder(UPLOAD_PATH);

// app
const app = express();
app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello World!');
})

app.post('/profile', upload.single('avatar'), async (req, res) => {
    const col = await loadCollection(COLLECTION_NAME, db);
    const data = col.insert(req.file);

    db.saveDatabase();
    res.send({ id: data.$loki, fileName: data.filename });
})

app.post('/photos/upload', upload.array('photos', 12), async (req, res) => {
    const col = await loadCollection(COLLECTION_NAME, db)
    let data = [];

    (req.files as any).forEach(x => {
        data = data.concat(col.insert(x));
        db.saveDatabase();
    })
    res.send(data.map(x => ({ id: x.$loki, fileName: x.filename })));
})

app.get('/images', async (req, res) => {
    const col = await loadCollection(COLLECTION_NAME, db);

    res.send(col.data);
})

app.get('/images/:id', async (req, res) => {
    const col = await loadCollection(COLLECTION_NAME, db);
    const result = col.get(req.params.id);

    if (!result) {
        res.sendStatus(404);
        return;
    };
    res.setHeader('Content-Type', result.mimetype);
    fs.createReadStream(path.join(UPLOAD_PATH, result.filename)).pipe(res);
})

app.listen(3000, function () {
    console.log('listening on port 3000!');
})