import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/chat/route';
import { NextRequest } from 'next/server';

const mockHandle = vi.fn();

vi.mock('@/application/command/AddMessageHandler', () => {
  return {
    AddMessageHandler: class MockAddMessageHandler {
      handle = mockHandle;
    },
  };
});

describe('Chat API Route (POST)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 if the body format is invalid', async () => {
    const rawReq = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: '' }), // Invalid empty message
    });
    const req = new NextRequest(rawReq);

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('Mensaje inválido');
    expect(mockHandle).not.toHaveBeenCalled();
  });

  it('should successfully pass command to handler and return response', async () => {
    const rawReq = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'What is the safe route?' }),
    });
    const req = new NextRequest(rawReq);

    mockHandle.mockResolvedValue({ message: 'Take path A' });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.message).toBe('Take path A');
    expect(mockHandle).toHaveBeenCalledWith({ message: 'What is the safe route?' });
  });

  it('should return 500 if handler throws an error', async () => {
    const rawReq = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'What is the safe route?' }),
    });
    const req = new NextRequest(rawReq);

    mockHandle.mockRejectedValue(new Error('LLM Timeout'));

    // Suppress console.error in tests
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(req);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe('Ocurrió un error al procesar la solicitud');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
