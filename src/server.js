import 'dotenv/config';
import app from './app.js';

// Importing the queue file starts the BullMQ Worker automatically.
// The worker runs in this same process and listens for jobs.
import './queues/payroll.queue.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});