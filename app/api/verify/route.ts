import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { hashDeedData, verifyDeedOnChain, isBlockchainConfigured } from "@/lib/blockchain"

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const { deed_number } = await request.json()

    if (!deed_number) {
      return NextResponse.json(
        { error: "Deed number is required" },
        { status: 400 }
      )
    }

    const sql = getDb()

    // Look up deed in database
    const deeds = await sql`
      SELECT * FROM deeds WHERE deed_number = ${deed_number}
    `

    if (deeds.length === 0) {
      // Log failed verification
      await sql`
        INSERT INTO verification_logs (deed_number, verified_by, verification_result, blockchain_verified)
        VALUES (${deed_number}, ${user.id}, 'not_found', false)
      `
      return NextResponse.json({
        result: "not_found",
        message: "No deed found with this number in the registry.",
        blockchain_verified: false,
      })
    }

    const deed = deeds[0]
    let blockchainVerified = false
    let blockchainData = null

    // Verify on blockchain if configured
    const blockchainReady = await isBlockchainConfigured()
    if (blockchainReady && deed.blockchain_tx_hash) {
      blockchainData = await verifyDeedOnChain(deed_number)
      if (blockchainData && blockchainData.isRegistered) {
        // Recompute hash from DB data and compare with on-chain hash
        const recomputedHash = hashDeedData({
          deedNumber: deed.deed_number,
          ownerName: deed.owner_name,
          propertyLocation: deed.property_location,
          issueDate: deed.issue_date,
          nationalId: deed.national_id,
          landSize: deed.land_size,
        })
        blockchainVerified = blockchainData.documentHash === recomputedHash
      }
    }

    const verificationResult = blockchainVerified || deed.blockchain_status === "confirmed"
      ? "authentic"
      : "fraudulent"

    // Log verification
    await sql`
      INSERT INTO verification_logs (deed_id, deed_number, verified_by, verification_result, blockchain_verified)
      VALUES (${deed.id}, ${deed_number}, ${user.id}, ${verificationResult}, ${blockchainVerified})
    `

    return NextResponse.json({
      result: verificationResult,
      deed: {
        deed_number: deed.deed_number,
        owner_name: deed.owner_name,
        property_location: deed.property_location,
        issue_date: deed.issue_date,
        land_size: deed.land_size,
        document_hash: deed.document_hash,
        blockchain_status: deed.blockchain_status,
        blockchain_tx_hash: deed.blockchain_tx_hash,
        created_at: deed.created_at,
      },
      blockchain_verified: blockchainVerified,
      blockchain_data: blockchainData,
      message:
        verificationResult === "authentic"
          ? "This deed is authentic and verified on the blockchain."
          : "Warning: This deed could not be fully verified. Please contact the Deeds Registry office.",
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error"
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 })
    }
    console.error("Verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
