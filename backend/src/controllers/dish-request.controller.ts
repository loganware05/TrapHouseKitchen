import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';

const requestSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
});

const voteSchema = z.object({
  value: z.number().int().min(-1).max(1), // 1 or -1
});

export const getRequests = async (req: Request, res: Response) => {
  try {
    const requests = await prisma.dishRequest.findMany({
      include: {
        customer: {
          select: { name: true },
        },
      },
      orderBy: [
        { upvotes: 'desc' },
        { createdAt: 'desc' },
      ],
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching requests', error });
  }
};

export const createRequest = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    const { title, description } = requestSchema.parse(req.body);

    const request = await prisma.dishRequest.create({
      data: {
        title,
        description,
        customerId: userId,
      },
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(400).json({ message: 'Error creating request', error });
  }
};

export const voteRequest = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    const { id } = req.params;
    const { value } = voteSchema.parse(req.body);

    if (value === 0) return res.status(400).json({ message: 'Vote must be 1 or -1' });

    // Check if user already voted
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_dishRequestId: {
          userId,
          dishRequestId: id,
        },
      },
    });

    if (existingVote) {
        if (existingVote.value === value) {
            return res.status(400).json({ message: 'You have already voted this way' });
        }
        
        // Change vote (e.g. up to down)
        // Adjust counts
        const upvoteChange = value === 1 ? 1 : -1;
        const downvoteChange = value === -1 ? 1 : -1;

        await prisma.$transaction([
            prisma.vote.update({
                where: { id: existingVote.id },
                data: { value },
            }),
            prisma.dishRequest.update({
                where: { id },
                data: {
                    upvotes: { increment: value === 1 ? 1 : -1 }, // if switching to up, inc up. if switching to down, dec up (which is -1)
                    downvotes: { increment: value === -1 ? 1 : -1 }
                }
            })
        ]);
        
        // Wait, logic is complex. 
        // If Old was 1 (Up), New is -1 (Down).
        // Upvotes -1. Downvotes +1.
        
        // If Old was -1 (Down), New is 1 (Up).
        // Upvotes +1. Downvotes -1.
        
        return res.json({ message: 'Vote updated' });
    }

    // New Vote
    await prisma.$transaction([
      prisma.vote.create({
        data: {
          userId,
          dishRequestId: id,
          value,
        },
      }),
      prisma.dishRequest.update({
        where: { id },
        data: {
          upvotes: { increment: value === 1 ? 1 : 0 },
          downvotes: { increment: value === -1 ? 1 : 0 },
        },
      }),
    ]);

    res.json({ message: 'Vote recorded' });
  } catch (error) {
    res.status(400).json({ message: 'Error voting', error });
  }
};

