import { NextResponse } from "next/server";
import { detectFetBinary } from "@/lib/fet/runner";

export async function GET() {
  const { path, version } = await detectFetBinary();
  return NextResponse.json({
    available: Boolean(path),
    path,
    version,
  });
}
