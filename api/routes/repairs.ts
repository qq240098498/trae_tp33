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

router.get('/:id/repairs', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const propertyId = Number(req.params.id)

  const result = db.exec('SELECT * FROM repair_records WHERE property_id = ? ORDER BY repair_date DESC', [propertyId])
  const repairs = result[0] ? result[0].values.map((r) => mapRow(result[0].columns, r)) : []

  res.json({ success: true, data: repairs })
})

router.post('/:id/repairs', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const propertyId = Number(req.params.id)

  const existing = db.exec('SELECT id FROM properties WHERE id = ?', [propertyId])
  if (!existing[0] || existing[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'Property not found' })
    return
  }

  const { repair_date, description, result, cost, landlord_borne } = req.body
  if (!repair_date || !description) {
    res.status(400).json({ success: false, error: 'Missing required fields' })
    return
  }

  db.run(
    `INSERT INTO repair_records (property_id, repair_date, description, result, cost, landlord_borne) VALUES (?, ?, ?, ?, ?, ?)`,
    [propertyId, repair_date, description, result || '', cost || 0, landlord_borne ? 1 : 0]
  )

  const idResult = db.exec('SELECT last_insert_rowid() as id')
  const id = idResult[0].values[0][0] as number
  saveDb()

  res.status(201).json({ success: true, data: { id } })
})

router.put('/repairs/:id', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const id = Number(req.params.id)

  const existing = db.exec('SELECT id FROM repair_records WHERE id = ?', [id])
  if (!existing[0] || existing[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'Repair record not found' })
    return
  }

  const { repair_date, description, result, cost, landlord_borne } = req.body
  if (!repair_date || !description) {
    res.status(400).json({ success: false, error: 'Missing required fields' })
    return
  }

  db.run(
    `UPDATE repair_records SET repair_date = ?, description = ?, result = ?, cost = ?, landlord_borne = ? WHERE id = ?`,
    [repair_date, description, result || '', cost || 0, landlord_borne ? 1 : 0, id]
  )
  saveDb()

  res.json({ success: true, data: { id } })
})

router.delete('/repairs/:id', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const id = Number(req.params.id)

  const existing = db.exec('SELECT id FROM repair_records WHERE id = ?', [id])
  if (!existing[0] || existing[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'Repair record not found' })
    return
  }

  db.run('DELETE FROM repair_records WHERE id = ?', [id])
  saveDb()

  res.json({ success: true, data: { id } })
})

router.get('/:id/repairs/export', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb()
  const propertyId = Number(req.params.id)

  const propResult = db.exec('SELECT * FROM properties WHERE id = ?', [propertyId])
  if (!propResult[0] || propResult[0].values.length === 0) {
    res.status(404).json({ success: false, error: 'Property not found' })
    return
  }
  const prop = mapRow(propResult[0].columns, propResult[0].values[0])

  const result = db.exec('SELECT * FROM repair_records WHERE property_id = ? ORDER BY repair_date ASC', [propertyId])
  const repairs = result[0] ? result[0].values.map((r) => mapRow(result[0].columns, r)) : []

  const totalCost = repairs.reduce((sum: number, r: any) => sum + (r.cost || 0), 0)
  const landlordCost = repairs.filter((r: any) => r.landlord_borne).reduce((sum: number, r: any) => sum + (r.cost || 0), 0)
  const tenantCost = totalCost - landlordCost

  let content = `房屋维护记录报告\n`
  content += `${'='.repeat(50)}\n\n`
  content += `房屋地址：${prop.address}\n`
  content += `房东姓名：${prop.landlord_name}\n`
  content += `合同期间：${prop.contract_start} 至 ${prop.contract_end}\n`
  content += `报告生成时间：${new Date().toLocaleString('zh-CN')}\n\n`
  content += `${'─'.repeat(50)}\n`
  content += `维修历史时间线\n`
  content += `${'─'.repeat(50)}\n\n`

  if (repairs.length === 0) {
    content += `暂无维修记录\n`
  } else {
    repairs.forEach((r: any, i: number) => {
      content += `[${i + 1}] ${r.repair_date}\n`
      content += `    故障描述：${r.description}\n`
      content += `    维修结果：${r.result || '未记录'}\n`
      content += `    花费金额：¥${r.cost.toLocaleString()}\n`
      content += `    房东承担：${r.landlord_borne ? '是' : '否'}\n\n`
    })
  }

  content += `${'─'.repeat(50)}\n`
  content += `费用汇总\n`
  content += `${'─'.repeat(50)}\n`
  content += `总花费金额：¥${totalCost.toLocaleString()}\n`
  content += `房东承担金额：¥${landlordCost.toLocaleString()}\n`
  content += `租客承担金额：¥${tenantCost.toLocaleString()}\n`
  content += `维修记录总数：${repairs.length} 条\n\n`
  content += `${'='.repeat(50)}\n`
  content += `本报告可作为退租时"房屋维护正常"的证明，避免押金纠纷。\n`

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`维修记录_${prop.address}.txt`)}`)
  res.send(content)
})

export default router
