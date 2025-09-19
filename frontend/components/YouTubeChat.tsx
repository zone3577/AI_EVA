import React from 'react';
import { Card } from '@/components/ui/card';

interface YouTubeChatProps {
  ytChatLog: string[];
}

export default function YouTubeChat({ ytChatLog }: YouTubeChatProps) {
  if (ytChatLog.length === 0) return null;

  return (
    <Card className="border-0 rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-xl ring-1 ring-black/5">
      <div className="pt-6 px-6 pb-6">
        <h2 className="text-lg font-semibold mb-4 text-zinc-800 dark:text-zinc-100">
          YouTube Live Chat (ล่าสุด 3 ข้อความ):
        </h2>
        {(() => {
          const lastThree = ytChatLog.slice(-3);
          return (
            <ul className="space-y-2">
              {lastThree.map((msg, idx) => {
                const isLatest = idx === lastThree.length - 1;
                return (
                  <li
                    key={idx}
                    className={`text-sm rounded-xl px-3 py-2 border flex items-start gap-2 shadow-sm transition-colors ${
                      isLatest
                        ? 'bg-blue-50/80 border-blue-200 text-blue-800 ring-1 ring-blue-500/10 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-200'
                        : 'bg-gray-50/80 border-gray-200 text-gray-700 ring-1 ring-black/5 dark:bg-gray-800/40 dark:border-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <span className="inline-block w-2 h-2 mt-1 rounded-full bg-current opacity-60" />
                    <span className="flex-1 break-words leading-relaxed">{msg}</span>
                  </li>
                );
              })}
            </ul>
          );
        })()}
        <p className="mt-3 text-[11px] text-gray-400 italic">
          (ระบบเก็บทั้งหมด แต่แสดงเฉพาะ 3 ข้อความล่าสุด)
        </p>
      </div>
    </Card>
  );
}