import { Router } from 'express';
import { prisma } from 'database';

const router: Router = Router();

// Endpoint nội bộ, không expose ra ngoài qua API Gateway
router.get('/users/:id', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;