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

function computeStatus(contractEnd: string) {
  const now = new Date()
  const end = new Date(contractEnd)
  const diffMs = end.getTime() - now.getTime()
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  let status: string
  if (daysRemaining <= 0) status = 'expired'
  else if (daysRemaining <= 45) status = 'expiring'
  else status = 'safe'
  return { daysRemaining, status }
}

function generateReminders(db: ReturnType<typeof getDb> extends Promise<infer T> ? T : never, propertyId: number, contractEnd: string) {
  const end = new Date(contractEnd)
  const types: { type: '45_days' | '30_days' | '15_days'; offset: number }[] = [
    { type: '45_days', offset: 45 },
    { type: '30_days', offset: 30 },
    { type: '15_days', offset: 15 },
  ]
  for (const { type, offset } of types) {
    const d = new Date(end.getTime() - offset * 24 * 60 * 60 * 1000)
    const dateStr = d.toISOString().slice(0, 10)
    const existing = db.exec(
      `SELECT id FROM reminders WHERE property_id = ? AND reminder_type = ? AND reminder_date = ?`,
      [propertyId, type, dateStr]
    )
    if (!existing[0] || existing[0].values.length === 0) {
      db.run(
        `INSERT INTO reminders (property_id, reminder_type, reminder_date) VALUES (?, ?, ?)`,
        [propertyId, type, dateStr]
      )
    }
  }
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const result = db.exec('SELECT * FROM properties ORDER BY created_at DESC')
  const properties = result[0]
    ? result[0].values.map((row) => {
        const obj = mapRow(result[0].columns, row)
        const { daysRemaining, status } = computeStatus(obj.contract_end)
        return { ...obj, days_remaining: daysRemaining, status }
      })
    : []
  res.json({ success: true, data: properties })
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const id = Number(req.params.id)

  const propResult = db.exec('SELECT * FROM properties WHERE id = ?', [id])
  if (!propResult[0] || propResult[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'Property not found' })
    return
  }
  const prop = mapRow(propResult[0].columns, propResult[0].values[0])
  const { daysRemaining, status } = computeStatus(prop.contract_end)
  const property = { ...prop, days_remaining: daysRemaining, status }

  const filesResult = db.exec('SELECT * FROM contract_files WHERE property_id = ?', [id])
  const files = filesResult[0] ? filesResult[0].values.map((r) => mapRow(filesResult[0].columns, r)) : []

  const paymentsResult = db.exec('SELECT * FROM payment_records WHERE property_id = ? ORDER BY payment_date DESC', [id])
  const payments = paymentsResult[0] ? paymentsResult[0].values.map((r) => mapRow(paymentsResult[0].columns, r)) : []

  const remindersResult = db.exec('SELECT * FROM reminders WHERE property_id = ?', [id])
  const reminders = remindersResult[0] ? remindersResult[0].values.map((r) => {
    const obj = mapRow(remindersResult[0].columns, r)
    const now = new Date()
    const reminderDate = new Date(obj.reminder_date)
    const diffMs = reminderDate.getTime() - now.getTime()
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    const isTriggered = daysRemaining <= 0 ? 1 : 0
    if (isTriggered && obj.is_triggered === 0) {
      db.run('UPDATE reminders SET is_triggered = 1 WHERE id = ?', [obj.id])
    }
    return { ...obj, is_triggered: isTriggered }
  }) : []

  const repairsResult = db.exec('SELECT * FROM repair_records WHERE property_id = ? ORDER BY repair_date DESC', [id])
  const repairs = repairsResult[0] ? repairsResult[0].values.map((r) => mapRow(repairsResult[0].columns, r)) : []

  saveDb()

  res.json({ success: true, data: { ...property, files, payments, reminders, repairs } })
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const { address, landlord_name, landlord_phone, agent_contact, rent_amount, payment_cycle, deposit_amount, contract_start, contract_end } = req.body

  if (!address || !landlord_name || !landlord_phone || !rent_amount || !payment_cycle || !contract_start || !contract_end) {
    res.status(400).json({ success: false, error: 'Missing required fields' })
    return
  }

  db.run(
    `INSERT INTO properties (address, landlord_name, landlord_phone, agent_contact, rent_amount, payment_cycle, deposit_amount, contract_start, contract_end)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [address, landlord_name, landlord_phone, agent_contact || '', rent_amount, payment_cycle, deposit_amount || 0, contract_start, contract_end]
  )

  const idResult = db.exec('SELECT last_insert_rowid() as id')
  const propertyId = idResult[0].values[0][0] as number

  generateReminders(db, propertyId, contract_end)
  saveDb()

  res.status(201).json({ success: true, data: { id: propertyId } })
})

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const id = Number(req.params.id)

  const existing = db.exec('SELECT id, contract_end FROM properties WHERE id = ?', [id])
  if (!existing[0] || existing[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'Property not found' })
    return
  }

  const oldContractEnd = existing[0].values[0][1] as string
  const { address, landlord_name, landlord_phone, agent_contact, rent_amount, payment_cycle, deposit_amount, contract_start, contract_end } = req.body

  db.run(
    `UPDATE properties SET address = ?, landlord_name = ?, landlord_phone = ?, agent_contact = ?, rent_amount = ?, payment_cycle = ?, deposit_amount = ?, contract_start = ?, contract_end = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [address, landlord_name, landlord_phone, agent_contact || '', rent_amount, payment_cycle, deposit_amount || 0, contract_start, contract_end, id]
  )

  if (oldContractEnd !== contract_end) {
    db.run('DELETE FROM reminders WHERE property_id = ?', [id])
    generateReminders(db, id, contract_end)
  }

  saveDb()

  res.json({ success: true, data: { id } })
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const id = Number(req.params.id)

  const existing = db.exec('SELECT id FROM properties WHERE id = ?', [id])
  if (!existing[0] || existing[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'Property not found' })
    return
  }

  db.run('DELETE FROM reminders WHERE property_id = ?', [id])
  db.run('DELETE FROM payment_records WHERE property_id = ?', [id])
  db.run('DELETE FROM contract_files WHERE property_id = ?', [id])
  db.run('DELETE FROM repair_records WHERE property_id = ?', [id])
  db.run('DELETE FROM properties WHERE id = ?', [id])
  saveDb()

  res.json({ success: true, data: { id } })
})

export default router
