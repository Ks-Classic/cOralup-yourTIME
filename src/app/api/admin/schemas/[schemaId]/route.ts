import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { formSchemas, formSchemaVersions } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

const adminApiKey = process.env.ADMIN_API_KEY

const assertAdminAuthorized = (request: NextRequest) => {
  if (!adminApiKey) return
  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  const headerKey = request.headers.get('x-admin-key')
  if (bearer === adminApiKey || headerKey === adminApiKey) return
  throw new Error('unauthorized')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schemaId: string }> }
) {
  try {
    assertAdminAuthorized(request)
    const { schemaId } = await params
    const rows = await db.select().from(formSchemas).where(eq(formSchemas.schemaId, schemaId)).limit(1)
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ data: rows[0] })
  } catch (error) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ schemaId: string }> }
) {
  try {
    assertAdminAuthorized(request)
    const { schemaId } = await params
    const body = await request.json()
    const { name, description, config, version } = body

    const existing = await db.select().from(formSchemas).where(eq(formSchemas.schemaId, schemaId)).limit(1)
    if (!existing[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (version) {
      await db.insert(formSchemaVersions).values({
        schemaId: existing[0].id,
        version: version,
        config: existing[0].config,
        changeLog: `Updated to version ${version}`
      } as typeof formSchemaVersions.$inferInsert)
    }

    const updated = await db.update(formSchemas).set({
      name,
      description,
      config,
      version: version || '1.0',
      updatedAt: new Date()
    } as Partial<typeof formSchemas.$inferInsert>).where(eq(formSchemas.id, existing[0].id)).returning()

    return NextResponse.json({ data: updated[0] })
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ schemaId: string }> }
) {
  try {
    assertAdminAuthorized(request)
    const { schemaId } = await params
    await db.update(formSchemas).set({
      isActive: false,
      updatedAt: new Date()
    } as Partial<typeof formSchemas.$inferInsert>).where(eq(formSchemas.schemaId, schemaId))
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
