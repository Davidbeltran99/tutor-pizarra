export const runtime = "nodejs";

export async function GET() {
  try {
    const apiKey = process.env.DID_API_KEY;

    if (!apiKey) {
      return Response.json(
        { ok: false, message: "Falta DID_API_KEY" },
        { status: 500 }
      );
    }

    const res = await fetch(
      "https://api.d-id.com/agents/client-key",
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${apiKey}`,
        },
      }
    );

    const text = await res.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return Response.json(
        {
          ok: false,
          message: "D-ID devolvió HTML",
          raw: text.slice(0, 200),
        },
        { status: 500 }
      );
    }

    return Response.json(data);

  } catch (error: any) {
    return Response.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}