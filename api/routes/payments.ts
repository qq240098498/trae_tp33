import { Router, type Request, type Response } from 'express'
import { getDb, saveDb } from '../db.js'

const router = Router()

function mapRow(columns: string[], values: any[]) {
  const obj: Record<string, any> = {}
  columns.forEach((col, i) => {
    obj[col] = values[i]
  })
  return obj
}

router.get('/:id/payments', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const propertyId = Number(req.params.id)

  const result = db.exec('SELECT * FROM payment_records WHERE property_id = ? ORDER BY payment_date DESC', [propertyId])
  const payments = result[0] ? result[0].values.map((r) => mapRow(result[0].columns, r)) : []

  res.json({ success: true, data: payments })
})

router.post('/:id/payments', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const propertyId = Number(req.params.id)

  const existing = db.exec('SELECT id FROM properties WHERE id = ?', [propertyId])
  if (!existing[0] || existing[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'Property not found' })
    return
  }

  const { payment_date, amount, note } = req.body
  if (!payment_date || amount === undefined) {
    res.status(400).json({ success: false, error: 'Missing required fields' })
    return
  }

  db.run(
    `INSERT INTO payment_records (property_id, payment_date, amount, note) VALUES (?, ?, ?, ?)`,
    [propertyId, payment_date, amount, note || '']
  )

  const idResult = db.exec('SELECT last_insert_rowid() as id')
  const id = idResult[0].values[0][0] as number
  saveDb()

  res.status(201).json({ success: true, data: { id } })
})

router.delete('/payments/:id', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const id = Number(req.params.id)

  const existing = db.exec('SELECT id FROM payment_records WHERE id = ?', [id])
  if (!existing[0] || existing[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'Payment record not found' })
    return
  }

  db.run('DELETE FROM payment_records WHERE id = ?', [id])
  saveDb()

  res.json({ success: true, data: { id } })
})

export default router
