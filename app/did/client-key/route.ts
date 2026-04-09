export async function GET() {
  return Response.json({
    ok: true,
    message: "Ruta D-ID funcionando por GET",
  });
}

export async function POST() {
  return Response.json({
    ok: true,
    message: "Ruta D-ID funcionando por POST",
  });
}