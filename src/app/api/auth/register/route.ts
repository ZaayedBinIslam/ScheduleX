import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";

// The register form validates as you type, but the form is not the only way in
// — anything can POST here — so the same rules are enforced again server-side.
const RegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(200),
  password: z.string().min(8).max(200),
  organization: z.string().trim().max(200).optional(),
  role: z.string().trim().max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid registration details", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { email, name, password, organization, role } = parsed.data;

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash,
        organization: organization || null,
        role: role || null,
      },
    });

    // Select the fields explicitly. Returning the Prisma record as-is put the
    // bcrypt hash in the response body.
    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          organization: user.organization,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("REGISTRATION_ERROR", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
