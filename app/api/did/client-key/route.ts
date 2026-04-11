export const runtime = "nodejs";

export async function GET() {
  try {
    const apiKey = process.env.DID_API_KEY;

    if (!apiKey) {
      return Response.json(
        { ok: false, message: "Falta DID_API_KEY en variables de entorno" },
        { status: 500 }
      );
    }

    const res = await fetch(
      "https://api.d-id.com/agents/client-key",
      {
        method: "GET",
        headers: {
          // 🔥 IMPORTANTE: SIN base64
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
          message: "D-ID devolvió HTML (posible error)",
          raw: text.slice(0, 200),
        },
        { status: 500 }
      );
    }

    // 🔥 Si D-ID responde error tipo Unauthorized
    if (!res.ok) {
      return Response.json(
        {
          ok: false,
          message: data?.description || data?.message || "Error de D-ID",
          data,
        },
        { status: res.status }
      );
    }

    return Response.json({
      ok: true,
      client_key: data.client_key,
      allowed_domains: data.allowed_domains,
    });

  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        message: error?.message || "Error interno",
      },
      { status: 500 }
    );
  }
}