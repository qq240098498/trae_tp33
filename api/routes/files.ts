import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { getDb, saveDb } from '../db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads')

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
    cb(null, uniqueName)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type'))
    }
  },
})

function mapRow(columns: string[], values: any[]) {
  const obj: Record<string, any> = {}
  columns.forEach((col, i) => {
    obj[col] = values[i]
  })
  return obj
}

const router = Router()

router.get('/:id/files', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const propertyId = Number(req.params.id)

  const result = db.exec('SELECT * FROM contract_files WHERE property_id = ? ORDER BY uploaded_at DESC', [propertyId])
  const files = result[0] ? result[0].values.map((r) => mapRow(result[0].columns, r)) : []

  res.json({ success: true, data: files })
})

router.post('/:id/files', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const propertyId = Number(req.params.id)

  const existing = db.exec('SELECT id FROM properties WHERE id = ?', [propertyId])
  if (!existing[0] || existing[0].values.length === 0) {
    if (req.file) fs.unlinkSync(req.file.path)
    res.status(404).json({ success: false, error: 'Property not found' })
    return
  }

  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file uploaded' })
    return
  }

  const originalName = req.file.originalname
  const ext = path.extname(originalName).toLowerCase()
  const fileType = ext === '.pdf' ? 'pdf' : 'image'

  db.run(
    `INSERT INTO contract_files (property_id, filename, original_name, file_type, file_size)
     VALUES (?, ?, ?, ?, ?)`,
    [propertyId, req.file.filename, originalName, fileType, req.file.size]
  )

  const idResult = db.exec('SELECT last_insert_rowid() as id')
  const fileId = idResult[0].values[0][0] as number
  saveDb()

  res.status(201).json({ success: true, data: { id: fileId, filename: req.file.filename, original_name: originalName, file_type: fileType, file_size: req.file.size } })
})

router.delete('/files/:id', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const id = Number(req.params.id)

  const result = db.exec('SELECT filename FROM contract_files WHERE id = ?', [id])
  if (!result[0] || result[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'File not found' })
    return
  }

  const filename = result[0].values[0][0] as string
  const filePath = path.join(UPLOADS_DIR, filename)

  db.run('DELETE FROM contract_files WHERE id = ?', [id])
  saveDb()

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }

  res.json({ success: true, data: { id } })
})

router.get('/files/:id/download', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const id = Number(req.params.id)

  const result = db.exec('SELECT filename, original_name FROM contract_files WHERE id = ?', [id])
  if (!result[0] || result[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'File not found' })
    return
  }

  const filename = result[0].values[0][0] as string
  const originalName = result[0].values[0][1] as string
  const filePath = path.join(UPLOADS_DIR, filename)

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ success: false, error: 'File not found on disk' })
    return
  }

  res.download(filePath, originalName)
})

export default router
