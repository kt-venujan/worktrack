'use client';

import { useMemo } from 'react';
import { Task, isDone, isOverdue } from '../lib/model';
import { PieChart, BarChart3, Tag, CheckCircle2, AlertCircle, Clock, ShieldCheck } from 'lucide-react';

interface AnalyticsChartsProps {
  tasks: Task[];
  clients: string[];
}

function isApproved(approval: string) {
  return ['true', 'yes', '1', 'approved'].includes((approval || '').trim().toLowerCase());
}

export default function AnalyticsCharts({ tasks, clients }: AnalyticsChartsProps) {
  const total = tasks.length;

  // Status Metrics
  const statusStats = useMemo(() => {
    if (!total) {
      return { done: 0, progress: 0, listed: 0, overdue: 0 };
    }
    const done = tasks.filter((t) => isDone(t.status)).length;
    const overdue = tasks.filter(isOverdue).length;
    const progress = tasks.filter(
      (t) =>
        !isDone(t.status) &&
        !isOverdue(t) &&
        ['progress', 'in progress', 'doing'].includes((t.status || '').trim().toLowerCase())
    ).length;
    const listed = total - (done + overdue + progress);

    return { done, progress, listed, overdue };
  }, [tasks, total]);

  // Type Metrics
  const typeStats = useMemo(() => {
    if (!total) return { change: 0, task: 0, bug: 0, other: 0 };
    let change = 0;
    let task = 0;
    let bug = 0;
    let other = 0;

    for (const t of tasks) {
      const type = (t.type || '').trim().toLowerCase();
      if (type === 'bug') bug++;
      else if (type === 'task') task++;
      else if (type === 'change') change++;
      else other++;
    }

    return { change, task, bug, other };
  }, [tasks, total]);

  // Top Clients Workload (Top 6)
  const topClients = useMemo(() => {
    if (!total) return [];
    const map = new Map<string, { total: number; done: number; pending: number }>();

    for (const t of tasks) {
      const c = t.client || 'Unknown';
      const current = map.get(c) || { total: 0, done: 0, pending: 0 };
      current.total += 1;
      if (isDone(t.status)) {
        current.done += 1;
      } else {
        current.pending += 1;
      }
      map.set(c, current);
    }

    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [tasks, total]);

  // Approval Rate
  const approvedCount = useMemo(() => {
    return tasks.filter((t) => isApproved(t.approval)).length;
  }, [tasks]);

  if (total === 0) return null;

  // Donut SVG Calculations
  const r = 64;
  const circumference = 2 * Math.PI * r;

  const doneShare = (statusStats.done / total) * circumference;
  const progShare = (statusStats.progress / total) * circumference;
  const listedShare = (statusStats.listed / total) * circumference;
  const overdueShare = (statusStats.overdue / total) * circumference;

  const doneOffset = 0;
  const progOffset = -doneShare;
  const listedOffset = -(doneShare + progShare);
  const overdueOffset = -(doneShare + progShare + listedShare);

  const maxClientTotal = topClients[0]?.total || 1;

  return (
    <div className="analyticsGrid">
      {/* 1. Status Breakdown Donut Chart */}
      <div className="analyticsCard">
        <div className="analyticsCardHead">
          <div className="analyticsTitle">
            <PieChart size={18} className="chartIcon textBlue" />
            <div>
              <h3>Status & Health Breakdown</h3>
              <p className="cardSub">Overall completion and overdue status</p>
            </div>
          </div>
          <span className="analyticsBadge">{total} Tasks</span>
        </div>

        <div className="donutContainer">
          <div className="donutSvgWrap">
            <svg viewBox="0 0 160 160" className="donutSvg">
              {/* Background ring */}
              <circle cx="80" cy="80" r={r} fill="none" stroke="#f1f5f9" strokeWidth="18" />

              {/* Done Segment */}
              {statusStats.done > 0 && (
                <circle
                  cx="80"
                  cy="80"
                  r={r}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="18"
                  strokeDasharray={`${doneShare} ${circumference - doneShare}`}
                  strokeDashoffset={doneOffset}
                  strokeLinecap="round"
                  className="donutSegment"
                />
              )}

              {/* Progress Segment */}
              {statusStats.progress > 0 && (
                <circle
                  cx="80"
                  cy="80"
                  r={r}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="18"
                  strokeDasharray={`${progShare} ${circumference - progShare}`}
                  strokeDashoffset={progOffset}
                  strokeLinecap="round"
                  className="donutSegment"
                />
              )}

              {/* Listed Segment */}
              {statusStats.listed > 0 && (
                <circle
                  cx="80"
                  cy="80"
                  r={r}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="18"
                  strokeDasharray={`${listedShare} ${circumference - listedShare}`}
                  strokeDashoffset={listedOffset}
                  strokeLinecap="round"
                  className="donutSegment"
                />
              )}

              {/* Overdue Segment */}
              {statusStats.overdue > 0 && (
                <circle
                  cx="80"
                  cy="80"
                  r={r}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="18"
                  strokeDasharray={`${overdueShare} ${circumference - overdueShare}`}
                  strokeDashoffset={overdueOffset}
                  strokeLinecap="round"
                  className="donutSegment"
                />
              )}
            </svg>

            <div className="donutCenter">
              <span className="donutNumber">{Math.round((statusStats.done / total) * 100)}%</span>
              <span className="donutLabel">Closed</span>
            </div>
          </div>

          <div className="donutLegend">
            <div className="legendItem">
              <span className="legendDot" style={{ background: '#10b981' }} />
              <div className="legendInfo">
                <span className="legendName">Done</span>
                <span className="legendVal">
                  <strong>{statusStats.done}</strong> ({Math.round((statusStats.done / total) * 100)}%)
                </span>
              </div>
            </div>

            <div className="legendItem">
              <span className="legendDot" style={{ background: '#3b82f6' }} />
              <div className="legendInfo">
                <span className="legendName">Progress</span>
                <span className="legendVal">
                  <strong>{statusStats.progress}</strong> ({Math.round((statusStats.progress / total) * 100)}%)
                </span>
              </div>
            </div>

            <div className="legendItem">
              <span className="legendDot" style={{ background: '#f59e0b' }} />
              <div className="legendInfo">
                <span className="legendName">Listed</span>
                <span className="legendVal">
                  <strong>{statusStats.listed}</strong> ({Math.round((statusStats.listed / total) * 100)}%)
                </span>
              </div>
            </div>

            <div className="legendItem">
              <span className="legendDot" style={{ background: '#ef4444' }} />
              <div className="legendInfo">
                <span className="legendName">Overdue</span>
                <span className="legendVal">
                  <strong>{statusStats.overdue}</strong> ({Math.round((statusStats.overdue / total) * 100)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Clients Workload Bar Chart */}
      <div className="analyticsCard">
        <div className="analyticsCardHead">
          <div className="analyticsTitle">
            <BarChart3 size={18} className="chartIcon textIndigo" />
            <div>
              <h3>Workload by Top Clients</h3>
              <p className="cardSub">Workspaces with the highest request volumes</p>
            </div>
          </div>
          <span className="analyticsBadge">{clients.length} Clients</span>
        </div>

        <div className="clientBarList">
          {topClients.map((c) => {
            const widthPct = Math.max(12, Math.round((c.total / maxClientTotal) * 100));
            const donePct = c.total ? Math.round((c.done / c.total) * 100) : 0;
            return (
              <div key={c.name} className="clientBarRow">
                <div className="clientBarHeader">
                  <span className="clientBarName" title={c.name}>
                    {c.name}
                  </span>
                  <span className="clientBarCount">
                    <strong>{c.total}</strong> total · <span className="textGreen">{c.done} done</span>
                  </span>
                </div>
                <div className="clientBarTrack">
                  <div
                    className="clientBarFill"
                    style={{ width: `${widthPct}%` }}
                    title={`${c.name}: ${c.done} done, ${c.pending} pending (${c.total} total)`}
                  >
                    <div className="clientBarDone" style={{ width: `${donePct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Task Type & Approval Distribution */}
      <div className="analyticsCard">
        <div className="analyticsCardHead">
          <div className="analyticsTitle">
            <Tag size={18} className="chartIcon textPurple" />
            <div>
              <h3>Type & Approval Distribution</h3>
              <p className="cardSub">Classification and manager approval status</p>
            </div>
          </div>
          <span className="analyticsBadge">{Math.round((approvedCount / total) * 100)}% Approved</span>
        </div>

        {/* Stacked type bar */}
        <div className="stackedTypeBarWrap">
          <div className="stackedTypeBar">
            {typeStats.change > 0 && (
              <div
                className="typeBarSegment segmentChange"
                style={{ width: `${(typeStats.change / total) * 100}%` }}
                title={`Change: ${typeStats.change}`}
              />
            )}
            {typeStats.task > 0 && (
              <div
                className="typeBarSegment segmentTask"
                style={{ width: `${(typeStats.task / total) * 100}%` }}
                title={`Task: ${typeStats.task}`}
              />
            )}
            {typeStats.bug > 0 && (
              <div
                className="typeBarSegment segmentBug"
                style={{ width: `${(typeStats.bug / total) * 100}%` }}
                title={`Bug: ${typeStats.bug}`}
              />
            )}
            {typeStats.other > 0 && (
              <div
                className="typeBarSegment segmentOther"
                style={{ width: `${(typeStats.other / total) * 100}%` }}
                title={`Other: ${typeStats.other}`}
              />
            )}
          </div>
        </div>

        {/* Type Cards Grid */}
        <div className="typeMetricGrid">
          <div className="typeMetricBox bgChange">
            <span className="typeMetricName">Changes</span>
            <strong className="typeMetricNum">{typeStats.change}</strong>
            <span className="typeMetricPct">{Math.round((typeStats.change / total) * 100)}%</span>
          </div>

          <div className="typeMetricBox bgTask">
            <span className="typeMetricName">Tasks</span>
            <strong className="typeMetricNum">{typeStats.task}</strong>
            <span className="typeMetricPct">{Math.round((typeStats.task / total) * 100)}%</span>
          </div>

          <div className="typeMetricBox bgBug">
            <span className="typeMetricName">Bugs</span>
            <strong className="typeMetricNum">{typeStats.bug}</strong>
            <span className="typeMetricPct">{Math.round((typeStats.bug / total) * 100)}%</span>
          </div>
        </div>

        {/* Approval Gauge Card */}
        <div className="approvalSummaryBox">
          <div className="approvalHeader">
            <div className="approvalTitle">
              <ShieldCheck size={16} className="textGreen" />
              <span>Manager Approvals</span>
            </div>
            <strong className="approvalCount">
              {approvedCount} of {total}
            </strong>
          </div>
          <div className="approvalTrack">
            <div
              className="approvalFill"
              style={{ width: `${Math.round((approvedCount / total) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
