"use client";

import React, { useState } from "react";

interface AuditLogEntry {
  id: string;
  actorId: string;
  actorRole: string;
  actionType: string;
  targetEntity: string;
  targetId: string | null;
  oldState: any;
  newState: any;
  reasonCode: string | null;
  metadata: any;
  createdAt: string;
}

export default function AuditLogViewer({ logs }: { logs: AuditLogEntry[] }) {
  const [filterAction, setFilterAction] = useState<string>("ALL");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const filteredLogs = logs.filter((log) => {
    if (filterAction === "ALL") return true;
    return log.actionType === filterAction;
  });

  const uniqueActions = Array.from(new Set(logs.map((l) => l.actionType)));

  return (
    <div className="space-y-4">
      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 bg-white p-4 rounded-2xl border border-slate-200">
        <button
          onClick={() => setFilterAction("ALL")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            filterAction === "ALL"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          ALL ({logs.length})
        </button>
        {uniqueActions.map((act) => (
          <button
            key={act}
            onClick={() => setFilterAction(act)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterAction === act
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {act}
          </button>
        ))}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Action</th>
                <th className="p-4">Actor</th>
                <th className="p-4">Target Entity</th>
                <th className="p-4">Reason / Code</th>
                <th className="p-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No audit records recorded yet.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-slate-50/80 transition">
                      <td className="p-4 text-slate-500 font-mono">
                        {new Date(log.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[10px] bg-slate-100 text-slate-800">
                          {log.actionType}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{log.actorRole}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {log.actorId.substring(0, 10)}...
                        </div>
                      </td>
                      <td className="p-4 font-mono font-semibold text-slate-700">
                        {log.targetEntity}
                      </td>
                      <td className="p-4">
                        {log.reasonCode ? (
                          <span className="text-slate-700 font-medium">{log.reasonCode}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() =>
                            setExpandedLogId(expandedLogId === log.id ? null : log.id)
                          }
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        >
                          {expandedLogId === log.id ? "Hide" : "Diff"}
                        </button>
                      </td>
                    </tr>

                    {/* Diff Inspection Panel */}
                    {expandedLogId === log.id && (
                      <tr className="bg-slate-50">
                        <td colSpan={6} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                            {log.oldState && (
                              <div className="bg-white p-3 rounded-xl border border-rose-200">
                                <span className="text-[10px] font-bold text-rose-700 uppercase block mb-1">
                                  State Before Mutation
                                </span>
                                <pre className="overflow-x-auto text-[11px] text-slate-700 max-h-48">
                                  {JSON.stringify(log.oldState, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.newState && (
                              <div className="bg-white p-3 rounded-xl border border-emerald-200">
                                <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">
                                  State After Mutation
                                </span>
                                <pre className="overflow-x-auto text-[11px] text-slate-700 max-h-48">
                                  {JSON.stringify(log.newState, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.metadata && (
                              <div className="col-span-1 md:col-span-2 bg-white p-3 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                  Compliance Metadata
                                </span>
                                <pre className="overflow-x-auto text-[11px] text-slate-600">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
