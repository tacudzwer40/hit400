import { generateText, Output } from "ai"
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import * as z from "zod"

const deedExtractionSchema = z.object({
  deed_number: z.string().nullable().describe("The deed or title number on the document"),
  owner_name: z.string().nullable().describe("Full name of the property owner"),
  national_id: z.string().nullable().describe("National ID or identification number of the owner"),
  property_location: z.string().nullable().describe("Physical location or address of the property"),
  issue_date: z.string().nullable().describe("Date the deed was issued (YYYY-MM-DD format if possible)"),
  land_size: z.string().nullable().describe("Size of the land parcel (e.g., '5 hectares', '2000 sqm')"),
  property_description: z.string().nullable().describe("Additional property description if available"),
  registrar_name: z.string().nullable().describe("Name of the registrar or issuing authority"),
})

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const { image } = await request.json()

    if (!image) {
      return NextResponse.json(
        { error: "Image data is required" },
        { status: 400 }
      )
    }

    const { output } = await generateText({
      model: "openai/gpt-4o",
      output: Output.object({
        schema: deedExtractionSchema,
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are analyzing a Zimbabwean land title deed document. Extract the following information accurately from the image. If a field is not visible or not present, return null for that field. Be precise with deed numbers and names.`,
            },
            {
              type: "image",
              image: image,
            },
          ],
        },
      ],
    })

    return NextResponse.json({ extractedData: output })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error"
    if (message === "Unauthorized" || message === "Forbidden: Admin access required") {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    console.error("AI extraction error:", error)
    return NextResponse.json(
      { error: "Failed to extract deed data. Please try again." },
      { status: 500 }
    )
  }
}
