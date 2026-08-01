import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, password, organization, role } = body;

    if (!email || !name || !password) {
      return new NextResponse("Missing information", { status: 400 });
    }

    const existingUser = await db.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return new NextResponse("User already exists", { status: 409 });
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

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("REGISTRATION_ERROR", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
