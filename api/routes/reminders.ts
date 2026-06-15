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

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()

  const result = db.exec(`
    SELECT r.*, p.address, p.landlord_name, p.landlord_phone, p.contract_end
    FROM reminders r
    JOIN properties p ON r.property_id = p.id
    ORDER BY r.reminder_date ASC
  `)

  const reminders = result[0]
    ? result[0].values.map((row) => {
        const obj = mapRow(result[0].columns, row)
        const now = new Date()
        const reminderDate = new Date(obj.reminder_date)
        const diffMs = reminderDate.getTime() - now.getTime()
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
        const isTriggered = daysRemaining <= 0 ? 1 : 0
        return { ...obj, days_remaining: daysRemaining, is_triggered: isTriggered }
      })
    : []

  reminders.sort((a, b) => {
    if (a.is_handled !== b.is_handled) return a.is_handled - b.is_handled
    return a.days_remaining - b.days_remaining
  })

  res.json({ success: true, data: reminders })
})

router.put('/:id/handle', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const id = Number(req.params.id)

  const existing = db.exec('SELECT id FROM reminders WHERE id = ?', [id])
  if (!existing[0] || existing[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'Reminder not found' })
    return
  }

  db.run('UPDATE reminders SET is_handled = 1 WHERE id = ?', [id])
  saveDb()

  res.json({ success: true, data: { id } })
})

export default router
