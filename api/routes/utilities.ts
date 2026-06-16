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
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
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

router.get('/:id/utilities', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const propertyId = Number(req.params.id)

  const existing = db.exec('SELECT id FROM properties WHERE id = ?', [propertyId])
  if (!existing[0] || existing[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'Property not found' })
    return
  }

  const recordsResult = db.exec(
    'SELECT * FROM utility_records WHERE property_id = ? ORDER BY record_date DESC, created_at DESC',
    [propertyId]
  )
  const records = recordsResult[0]
    ? recordsResult[0].values.map((r) => mapRow(recordsResult[0].columns, r))
    : []

  const photosResult = db.exec(
    'SELECT * FROM utility_photos WHERE property_id = ? ORDER BY uploaded_at DESC',
    [propertyId]
  )
  const photos = photosResult[0]
    ? photosResult[0].values.map((p) => mapRow(photosResult[0].columns, p))
    : []

  const recordsWithPhotos = records.map((record: any) => ({
    ...record,
    photos: photos.filter((p: any) => p.utility_record_id === record.id),
  }))

  res.json({ success: true, data: recordsWithPhotos })
})

router.post('/:id/utilities', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const propertyId = Number(req.params.id)

  const existing = db.exec('SELECT id FROM properties WHERE id = ?', [propertyId])
  if (!existing[0] || existing[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'Property not found' })
    return
  }

  const { type, record_type, reading, unit, record_date, note } = req.body
  if (!type || !record_type || !record_date || reading === undefined) {
    res.status(400).json({ success: false, error: 'Missing required fields' })
    return
  }

  db.run(
    `INSERT INTO utility_records (property_id, type, record_type, reading, unit, record_date, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      propertyId,
      type,
      record_type,
      reading || 0,
      unit || '',
      record_date,
      note || '',
    ]
  )

  const idResult = db.exec('SELECT last_insert_rowid() as id')
  const id = idResult[0].values[0][0] as number
  saveDb()

  res.status(201).json({ success: true, data: { id } })
})

router.put('/utilities/:id', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const id = Number(req.params.id)

  const existing = db.exec('SELECT id FROM utility_records WHERE id = ?', [id])
  if (!existing[0] || existing[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'Utility record not found' })
    return
  }

  const { type, record_type, reading, unit, record_date, note } = req.body
  if (!type || !record_type || !record_date || reading === undefined) {
    res.status(400).json({ success: false, error: 'Missing required fields' })
    return
  }

  db.run(
    `UPDATE utility_records SET type = ?, record_type = ?, reading = ?, unit = ?, record_date = ?, note = ? WHERE id = ?`,
    [type, record_type, reading || 0, unit || '', record_date, note || '', id]
  )
  saveDb()

  res.json({ success: true, data: { id } })
})

router.delete('/utilities/:id', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const id = Number(req.params.id)

  const existing = db.exec('SELECT id FROM utility_records WHERE id = ?', [id])
  if (!existing[0] || existing[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'Utility record not found' })
    return
  }

  const photosResult = db.exec('SELECT filename FROM utility_photos WHERE utility_record_id = ?', [id])
  if (photosResult[0]) {
    photosResult[0].values.forEach((row) => {
      const filename = row[0] as string
      const filePath = path.join(UPLOADS_DIR, filename)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    })
  }

  db.run('DELETE FROM utility_records WHERE id = ?', [id])
  saveDb()

  res.json({ success: true, data: { id } })
})

router.post('/utilities/:id/photos', upload.single('photo'), async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const recordId = Number(req.params.id)

  const existing = db.exec('SELECT id, property_id FROM utility_records WHERE id = ?', [recordId])
  if (!existing[0] || existing[0].values.length === 0) {
    if (req.file) fs.unlinkSync(req.file.path)
    res.status(404).json({ success: false, error: 'Utility record not found' })
    return
  }

  if (!req.file) {
    res.status(400).json({ success: false, error: 'No photo uploaded' })
    return
  }

  const propertyId = existing[0].values[0][1] as number

  db.run(
    `INSERT INTO utility_photos (utility_record_id, property_id, filename, original_name, file_size)
     VALUES (?, ?, ?, ?, ?)`,
    [recordId, propertyId, req.file.filename, req.file.originalname, req.file.size]
  )

  const idResult = db.exec('SELECT last_insert_rowid() as id')
  const photoId = idResult[0].values[0][0] as number
  saveDb()

  res.status(201).json({
    success: true,
    data: {
      id: photoId,
      utility_record_id: recordId,
      filename: req.file.filename,
      original_name: req.file.originalname,
      file_size: req.file.size,
    },
  })
})

router.delete('/utility-photos/:id', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const id = Number(req.params.id)

  const result = db.exec('SELECT filename FROM utility_photos WHERE id = ?', [id])
  if (!result[0] || result[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'Photo not found' })
    return
  }

  const filename = result[0].values[0][0] as string
  const filePath = path.join(UPLOADS_DIR, filename)

  db.run('DELETE FROM utility_photos WHERE id = ?', [id])
  saveDb()

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }

  res.json({ success: true, data: { id } })
})

router.get('/utility-photos/:id/download', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const id = Number(req.params.id)

  const result = db.exec('SELECT filename, original_name FROM utility_photos WHERE id = ?', [id])
  if (!result[0] || result[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'Photo not found' })
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

router.get('/:id/utilities/handover', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const propertyId = Number(req.params.id)

  const propResult = db.exec('SELECT * FROM properties WHERE id = ?', [propertyId])
  if (!propResult[0] || propResult[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'Property not found' })
    return
  }
  const prop = mapRow(propResult[0].columns, propResult[0].values[0])

  const recordsResult = db.exec(
    'SELECT * FROM utility_records WHERE property_id = ? ORDER BY record_date ASC, created_at ASC',
    [propertyId]
  )
  const records = recordsResult[0]
    ? recordsResult[0].values.map((r) => mapRow(recordsResult[0].columns, r))
    : []

  const typeLabels: Record<string, string> = {
    water: '水表',
    electricity: '电表',
    gas: '燃气表',
  }

  const recordTypeLabels: Record<string, string> = {
    check_in: '入住',
    check_out: '退租',
  }

  let content = '房屋水电煤交接确认单\n'
  content += `${'='.repeat(60)}\n\n`
  content += `房屋地址：${prop.address}\n`
  content += `房东姓名：${prop.landlord_name}\n`
  content += `联系电话：${prop.landlord_phone}\n`
  if (prop.agent_contact) {
    content += `中介联系方式：${prop.agent_contact}\n`
  }
  content += `合同期间：${prop.contract_start} 至 ${prop.contract_end}\n`
  content += `单据生成时间：${new Date().toLocaleString('zh-CN')}\n\n`

  content += `${'─'.repeat(60)}\n`
  content += '一、水电煤读数记录\n'
  content += `${'─'.repeat(60)}\n\n`

  if (records.length === 0) {
    content += '暂无水电煤读数记录\n\n'
  } else {
    const types = ['water', 'electricity', 'gas']

    types.forEach((type) => {
      const typeRecords = records.filter((r: any) => r.type === type)
      const checkInRecord = typeRecords.find((r: any) => r.record_type === 'check_in')
      const checkOutRecord = typeRecords.find((r: any) => r.record_type === 'check_out')

      content += `【${typeLabels[type]}】\n`
      content += `  入住读数：${checkInRecord ? checkInRecord.reading.toLocaleString() + ' ' + (checkInRecord.unit || '') : '未记录'}`
      if (checkInRecord) {
        content += `  (日期：${checkInRecord.record_date})`
      }
      content += '\n'

      content += `  退租读数：${checkOutRecord ? checkOutRecord.reading.toLocaleString() + ' ' + (checkOutRecord.unit || '') : '未记录'}`
      if (checkOutRecord) {
        content += `  (日期：${checkOutRecord.record_date})`
      }
      content += '\n'

      if (checkInRecord && checkOutRecord) {
        const usage = checkOutRecord.reading - checkInRecord.reading
        content += `  用量：${usage.toLocaleString()} ${checkInRecord.unit || ''}\n`
      }
      content += '\n'
    })

    content += `${'─'.repeat(60)}\n`
    content += '二、历史记录明细\n'
    content += `${'─'.repeat(60)}\n\n`

    records.forEach((record: any, index: number) => {
      content += `[${index + 1}] ${record.record_date}  ${typeLabels[record.type]} - ${recordTypeLabels[record.record_type]}\n`
      content += `    读数：${record.reading.toLocaleString()} ${record.unit || ''}\n`
      if (record.note) {
        content += `    备注：${record.note}\n`
      }
      content += '\n'
    })
  }

  content += `${'─'.repeat(60)}\n`
  content += '三、双方确认签字\n'
  content += `${'─'.repeat(60)}\n\n`
  content += '房东签字：________________________  日期：___________\n\n'
  content += '租客签字：________________________  日期：___________\n\n'

  content += `${'='.repeat(60)}\n`
  content += '本确认单作为退租时水电煤费用结算的凭证，双方签字后生效。\n'
  content += '请妥善保管，避免押金纠纷。\n'

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename*=UTF-8''${encodeURIComponent(`水电煤交接确认单_${prop.address}.txt`)}`
  )
  res.send(content)
})

export default router
