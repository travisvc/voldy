import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://api:8000";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");
    const queryParams = new URLSearchParams(url.searchParams);
    queryParams.delete("endpoint");
    const queryString = queryParams.toString();
    const response = await fetch(`${BACKEND_URL}/${endpoint}?${queryString}`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching data:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");
    const body = await req.json();

    const response = await fetch(`${BACKEND_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error posting data:", error);
    return NextResponse.json({ error: "Failed to post data" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");
    const queryParams = new URLSearchParams(url.searchParams);
    queryParams.delete("endpoint");
    const queryString = queryParams.toString();
    const body = await req.json();

    const response = await fetch(`${BACKEND_URL}/${endpoint}?${queryString}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error updating data:", error);
    return NextResponse.json(
      { error: "Failed to update data" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");
    const queryParams = new URLSearchParams(url.searchParams);
    queryParams.delete("endpoint");
    const queryString = queryParams.toString();

    const response = await fetch(`${BACKEND_URL}/${endpoint}?${queryString}`, {
      method: "DELETE",
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error deleting data:", error);
    return NextResponse.json(
      { error: "Failed to delete data" },
      { status: 500 }
    );
  }
}
