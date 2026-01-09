'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight } from 'lucide-react';

export default function LendPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new comprehensive lending hub
    router.push('/lending');
  }, [router]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md space-y-4"
      >
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <h1 className="font-heading text-2xl font-bold text-white">
          Redirecting to Lending Hub
        </h1>
        <p className="text-secondary-400">
          We've upgraded the lending experience. Redirecting you now...
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-secondary-500">
          <span>Going to</span>
          <ArrowRight className="h-4 w-4" />
          <span className="text-primary">/lending</span>
        </div>
      </motion.div>
    </div>
  );
}
