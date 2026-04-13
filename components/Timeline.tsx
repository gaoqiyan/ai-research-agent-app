"use client";

import { TimelineItem } from "@/types/conversation";

function SkeletonLine() {
  return <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />;
}

function StepSkeleton() {
  return (
    <div className="mb-6">
      <div className="h-5 w-60 bg-gray-200 rounded animate-pulse mb-2" />
      <div className="space-y-2 ml-4">
        <SkeletonLine />
        <SkeletonLine />
        <SkeletonLine />
      </div>
    </div>
  );
}

export default function Timeline({ data }: { data: TimelineItem[] }) {
  return (
    <div className="mt-6 border-l-2 border-gray-200 pl-4">
      {data.length === 0 && (
        <>
          <StepSkeleton />
          <StepSkeleton />
        </>
      )}
      {data.map((item, index) => (
        <div
          key={index}
          className={`mb-6 relative ${index === data.length - 1 ? "text-black" : "text-gray-500"}`}
        >
          <div
            className={`absolute -left-[25px] top-1 w-4 h-4 rounded-full ${
              item.done ? "bg-green-500" : "bg-gray-400 animate-pulse"
            }`}
          />

          <div className="font-semibold text-lg flex items-center gap-2 flex-wrap">
            <span>
              第{index + 1}步：{item.title}
            </span>

            {!item.done && (
              <span className="shrink-0 whitespace-nowrap text-sm text-gray-400">⏳ 进行中</span>
            )}

            {item.done && (
              <span className="shrink-0 whitespace-nowrap text-sm text-green-500">✅ 已完成</span>
            )}

            <div className="shrink-0 whitespace-nowrap text-sm text-gray-400">
              {`⏱️ ${item.duration}s`}
            </div>

            {!item.done && item.logs.length === 0 && (
              <div className="ml-4 mt-2 space-y-2">
                <SkeletonLine />
                <SkeletonLine />
              </div>
            )}
          </div>

          <div className="ml-4 mt-2 space-y-1 text-sm text-gray-600">
            {item.logs.map((log, i) => (
              <div
                key={i}
                className="opacity-0 animate-fadeIn"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                🔎 {log}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
