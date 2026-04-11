import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return Response.json(services);
  } catch {
    return Response.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, type, unitPrice, unitLabel } = await request.json();
    if (!name || !type || unitPrice == null) {
      return Response.json({ error: 'name, type and unitPrice are required' }, { status: 400 });
    }
    const service = await prisma.service.create({
      data: { name, type, unitPrice, unitLabel: unitLabel || null },
    });
    return Response.json(service, { status: 201 });
  } catch {
    return Response.json({ error: 'Failed to create service' }, { status: 500 });
  }
}
