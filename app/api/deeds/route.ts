import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { hashDeedData, registerDeedOnChain, isBlockchainConfigured } from "@/lib/blockchain"

// GET - list all deeds (admin only)
export async function GET() {
  try {
    await requireAdmin()
    const sql = getDb()
    const deeds = await sql`
      SELECT d.*, u.full_name as registered_by_name
      FROM deeds d
      LEFT JOIN users u ON d.registered_by = u.id
      ORDER BY d.created_at DESC
    `
    return NextResponse.json({ deeds })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error"
    if (message === "Unauthorized" || message === "Forbidden: Admin access required") {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - register a new deed (admin only)
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()

    const {
      deed_number,
      owner_name,
      national_id,
      property_location,
      issue_date,
      land_size,
      image_url,
      extracted_data,
    } = body

    if (!deed_number || !owner_name || !property_location) {
      return NextResponse.json(
        { error: "Deed number, owner name, and property location are required" },
        { status: 400 }
      )
    }

    // Create SHA-256 hash of deed data
    const documentHash = hashDeedData({
      deedNumber: deed_number,
      ownerName: owner_name,
      propertyLocation: property_location,
      issueDate: issue_date,
      nationalId: national_id,
      landSize: land_size,
    })

    const sql = getDb()

    // Insert deed into database
    const rows = await sql`
      INSERT INTO deeds (deed_number, owner_name, national_id, property_location, issue_date, land_size, image_url, extracted_data, document_hash, registered_by, blockchain_status)
      VALUES (${deed_number}, ${owner_name}, ${national_id || null}, ${property_location}, ${issue_date || null}, ${land_size || null}, ${image_url || null}, ${JSON.stringify(extracted_data || {})}, ${documentHash}, ${admin.id}, 'pending')
      RETURNING *
    `

    const deed = rows[0]

    // Attempt blockchain registration
    let blockchainResult = null
    const blockchainReady = await isBlockchainConfigured()

    if (blockchainReady) {
      try {
        blockchainResult = await registerDeedOnChain(deed_number, documentHash)
        await sql`
          UPDATE deeds
          SET blockchain_tx_hash = ${blockchainResult.txHash},
              blockchain_status = 'confirmed'
          WHERE id = ${deed.id}
        `
        deed.blockchain_tx_hash = blockchainResult.txHash
        deed.blockchain_status = "confirmed"
      } catch (bcError) {
        console.error("Blockchain registration failed:", bcError)
        await sql`
          UPDATE deeds SET blockchain_status = 'failed' WHERE id = ${deed.id}
        `
        deed.blockchain_status = "failed"
      }
    }

    return NextResponse.json({
      deed,
      documentHash,
      blockchain: blockchainResult,
      blockchainConfigured: blockchainReady,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error"
    if (message === "Unauthorized" || message === "Forbidden: Admin access required") {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    if (message.includes("duplicate key")) {
      return NextResponse.json(
        { error: "A deed with this number already exists" },
        { status: 409 }
      )
    }
    console.error("Deed registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
