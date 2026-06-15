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

function isWithin30Days(contractEnd: string): boolean {
  const end = new Date(contractEnd)
  const now = new Date()
  const diffTime = end.getTime() - now.getTime()
  const diffDays = diffTime / (1000 * 60 * 60 * 24)
  return diffDays <= 30 && diffDays >= 0
}

router.get('/:id/viewings/settings', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const propertyId = Number(req.params.id)

  const existing = db.exec('SELECT id, contract_end FROM properties WHERE id = ?', [propertyId])
  if (!existing[0] || existing[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'Property not found' })
    return
  }

  const result = db.exec('SELECT * FROM viewing_settings WHERE property_id = ?', [propertyId])
  let settings = result[0] ? mapRow(result[0].columns, result[0].values[0]) : null

  if (!settings) {
    settings = {
      id: null,
      property_id: propertyId,
      allow_weekday: 1,
      allow_weekend: 1,
      weekday_start: '09:00',
      weekday_end: '18:00',
      weekend_start: '10:00',
      weekend_end: '18:00',
      min_notice_hours: 24,
      extra_rules: '',
    }
  }

  const prop = mapRow(existing[0].columns, existing[0].values[0])
  res.json({
    success: true,
    data: {
      ...settings,
      can_record: isWithin30Days(prop.contract_end),
      contract_end: prop.contract_end,
    },
  })
})

router.put('/:id/viewings/settings', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const propertyId = Number(req.params.id)

  const existing = db.exec('SELECT id FROM properties WHERE id = ?', [propertyId])
  if (!existing[0] || existing[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'Property not found' })
    return
  }

  const {
    allow_weekday,
    allow_weekend,
    weekday_start,
    weekday_end,
    weekend_start,
    weekend_end,
    min_notice_hours,
    extra_rules,
  } = req.body

  const existingSettings = db.exec('SELECT id FROM viewing_settings WHERE property_id = ?', [propertyId])

  if (existingSettings[0] && existingSettings[0].values.length > 0) {
    db.run(
      `UPDATE viewing_settings SET 
        allow_weekday = ?, allow_weekend = ?, 
        weekday_start = ?, weekday_end = ?, 
        weekend_start = ?, weekend_end = ?, 
        min_notice_hours = ?, extra_rules = ?,
        updated_at = datetime('now')
        WHERE property_id = ?`,
      [
        allow_weekday ? 1 : 0,
        allow_weekend ? 1 : 0,
        weekday_start || '09:00',
        weekday_end || '18:00',
        weekend_start || '10:00',
        weekend_end || '18:00',
        min_notice_hours || 24,
        extra_rules || '',
        propertyId,
      ]
    )
  } else {
    db.run(
      `INSERT INTO viewing_settings 
        (property_id, allow_weekday, allow_weekend, weekday_start, weekday_end, weekend_start, weekend_end, min_notice_hours, extra_rules) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        propertyId,
        allow_weekday ? 1 : 0,
        allow_weekend ? 1 : 0,
        weekday_start || '09:00',
        weekday_end || '18:00',
        weekend_start || '10:00',
        weekend_end || '18:00',
        min_notice_hours || 24,
        extra_rules || '',
      ]
    )
  }

  saveDb()
  res.json({ success: true, data: { property_id: propertyId } })
})

router.get('/:id/viewings', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const propertyId = Number(req.params.id)

  const existing = db.exec('SELECT id, contract_end FROM properties WHERE id = ?', [propertyId])
  if (!existing[0] || existing[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'Property not found' })
    return
  }

  const result = db.exec(
    'SELECT * FROM viewing_records WHERE property_id = ? ORDER BY viewing_date DESC, viewing_time DESC',
    [propertyId]
  )
  const records = result[0] ? result[0].values.map((r) => mapRow(result[0].columns, r)) : []

  const prop = mapRow(existing[0].columns, existing[0].values[0])
  res.json({
    success: true,
    data: {
      records,
      can_record: isWithin30Days(prop.contract_end),
      contract_end: prop.contract_end,
    },
  })
})

router.post('/:id/viewings', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const propertyId = Number(req.params.id)

  const existing = db.exec('SELECT id, contract_end FROM properties WHERE id = ?', [propertyId])
  if (!existing[0] || existing[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'Property not found' })
    return
  }

  const prop = mapRow(existing[0].columns, existing[0].values[0])
  if (!isWithin30Days(prop.contract_end)) {
    res.status(400).json({ success: false, error: '仅合同到期前30天内可记录看房' })
    return
  }

  const { viewing_date, viewing_time, agent_name, agent_phone, note, status } = req.body
  if (!viewing_date || !viewing_time) {
    res.status(400).json({ success: false, error: '缺少日期和时间' })
    return
  }

  db.run(
    `INSERT INTO viewing_records (property_id, viewing_date, viewing_time, agent_name, agent_phone, note, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      propertyId,
      viewing_date,
      viewing_time,
      agent_name || '',
      agent_phone || '',
      note || '',
      status || 'scheduled',
    ]
  )

  const idResult = db.exec('SELECT last_insert_rowid() as id')
  const id = idResult[0].values[0][0] as number
  saveDb()

  res.status(201).json({ success: true, data: { id } })
})

router.put('/viewings/:id', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const id = Number(req.params.id)

  const existing = db.exec('SELECT id FROM viewing_records WHERE id = ?', [id])
  if (!existing[0] || existing[0].values.length === 0) {
    res.status(404).json({ success: false, error: '看房记录不存在' })
    return
  }

  const { viewing_date, viewing_time, agent_name, agent_phone, note, status } = req.body
  if (!viewing_date || !viewing_time) {
    res.status(400).json({ success: false, error: '缺少日期和时间' })
    return
  }

  db.run(
    `UPDATE viewing_records SET 
      viewing_date = ?, viewing_time = ?, 
      agent_name = ?, agent_phone = ?, 
      note = ?, status = ?
      WHERE id = ?`,
    [
      viewing_date,
      viewing_time,
      agent_name || '',
      agent_phone || '',
      note || '',
      status || 'scheduled',
      id,
    ]
  )
  saveDb()

  res.json({ success: true, data: { id } })
})

router.delete('/viewings/:id', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const id = Number(req.params.id)

  const existing = db.exec('SELECT id FROM viewing_records WHERE id = ?', [id])
  if (!existing[0] || existing[0].values.length === 0) {
    res.status(404).json({ success: false, error: '看房记录不存在' })
    return
  }

  db.run('DELETE FROM viewing_records WHERE id = ?', [id])
  saveDb()

  res.json({ success: true, data: { id } })
})

router.get('/:id/viewings/rules', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const propertyId = Number(req.params.id)

  const propResult = db.exec('SELECT * FROM properties WHERE id = ?', [propertyId])
  if (!propResult[0] || propResult[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'Property not found' })
    return
  }
  const prop = mapRow(propResult[0].columns, propResult[0].values[0])

  const settingsResult = db.exec('SELECT * FROM viewing_settings WHERE property_id = ?', [propertyId])
  let settings = settingsResult[0]
    ? mapRow(settingsResult[0].columns, settingsResult[0].values[0])
    : {
        allow_weekday: 1,
        allow_weekend: 1,
        weekday_start: '09:00',
        weekday_end: '18:00',
        weekend_start: '10:00',
        weekend_end: '18:00',
        min_notice_hours: 24,
        extra_rules: '',
      }

  let content = `【看房预约须知】\n\n`
  content += `房屋地址：${prop.address}\n\n`

  content += `一、可预约时间：\n`
  if (settings.allow_weekday) {
    content += `  • 工作日（周一至周五）：${settings.weekday_start} - ${settings.weekday_end}\n`
  } else {
    content += `  • 工作日：不接受看房\n`
  }
  if (settings.allow_weekend) {
    content += `  • 周末（周六至周日）：${settings.weekend_start} - ${settings.weekend_end}\n`
  } else {
    content += `  • 周末：不接受看房\n`
  }
  content += `\n`

  content += `二、预约要求：\n`
  content += `  • 请提前 ${settings.min_notice_hours} 小时预约\n`
  content += `  • 请在预约时间准时到达\n`
  content += `  • 如无法前来请提前告知\n`
  content += `\n`

  if (settings.extra_rules) {
    content += `三、其他说明：\n`
    content += `  ${settings.extra_rules}\n\n`
  }

  content += `【联系信息】\n`
  if (prop.landlord_name) content += `房东：${prop.landlord_name}`
  if (prop.landlord_phone) content += ` ${prop.landlord_phone}`
  content += `\n`
  if (prop.agent_contact) content += `中介：${prop.agent_contact}\n`

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`看房预约规则_${prop.address}.txt`)}`)
  res.send(content)
})

export default router
