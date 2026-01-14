import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';

const requestSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
});

const voteSchema = z.object({
  isUpvote: z.boolean(), // true for upvote, false for downvote
});

export const getRequests = async (req: Request, res: Response) => {
  try {
    const requests = await prisma.dishRequest.findMany({
      include: {
        user: {
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
        userId: userId,
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
    const { isUpvote } = voteSchema.parse(req.body);

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
        if (existingVote.isUpvote === isUpvote) {
            return res.status(400).json({ message: 'You have already voted this way' });
        }
        
        // Change vote (e.g. upvote to downvote or vice versa)
        // If changing from upvote to downvote: upvotes -1, downvotes +1
        // If changing from downvote to upvote: upvotes +1, downvotes -1
        
        await prisma.$transaction([
            prisma.vote.update({
                where: { id: existingVote.id },
                data: { isUpvote },
            }),
            prisma.dishRequest.update({
                where: { id },
                data: {
                    upvotes: { increment: isUpvote ? 1 : -1 },
                    downvotes: { increment: isUpvote ? -1 : 1 }
                }
            })
        ]);
        
        return res.json({ message: 'Vote updated' });
    }

    // New Vote
    await prisma.$transaction([
      prisma.vote.create({
        data: {
          userId,
          dishRequestId: id,
          isUpvote,
        },
      }),
      prisma.dishRequest.update({
        where: { id },
        data: {
          upvotes: { increment: isUpvote ? 1 : 0 },
          downvotes: { increment: isUpvote ? 0 : 1 },
        },
      }),
    ]);

    res.json({ message: 'Vote recorded' });
  } catch (error) {
    res.status(400).json({ message: 'Error voting', error });
  }
};

