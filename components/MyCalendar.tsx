'use client';

import { useState, useMemo } from 'react';
import {
  Task,
  isDone,
  isOverdue,
  formatDisplayDate,
  normalizeDate
} from '../lib/model';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Lock,
  Clock,
  CheckCircle2,
  AlertCircle,
  BriefcaseBusiness,
  User,
  Filter,
  Layers
} from 'lucide-react';

interface MyCalendarProps {
  tasks: Task[];
  clients: string[];
  onSelectTask: (task: Task) => void;
  onCreateTaskForDate: (dateStr: string, client?: string) => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function MyCalendar({
  tasks,
  clients,
  onSelectTask,
  onCreateTaskForDate
}: MyCalendarProps) {
  const todayStr = useMemo(() => getTodayStr(), []);

  // Current viewed month and year
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Selected date in format YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Filters
  const [selectedClient, setSelectedClient] = useState<string>('All clients');
  const [viewFilter, setViewFilter] = useState<'pending' | 'allDeadlines' | 'all'>('pending');

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(todayStr);
  };

  // Filter tasks by client first
  const clientFilteredTasks = useMemo(() => {
    if (selectedClient === 'All clients') return tasks;
    return tasks.filter((t) => t.client === selectedClient);
  }, [tasks, selectedClient]);

  // Index tasks by normalized date
  // Key: YYYY-MM-DD -> { deadlines: Task[], given: Task[] }
  const tasksByDate = useMemo(() => {
    const map: Record<string, { deadlines: Task[]; given: Task[] }> = {};

    clientFilteredTasks.forEach((t) => {
      const due = normalizeDate(t.dueDate);
      if (due && /^\d{4}-\d{2}-\d{2}$/.test(due)) {
        if (!map[due]) map[due] = { deadlines: [], given: [] };
        map[due].deadlines.push(t);
      }

      const given = normalizeDate(t.givenDate);
      if (given && /^\d{4}-\d{2}-\d{2}$/.test(given)) {
        if (!map[given]) map[given] = { deadlines: [], given: [] };
        map[given].given.push(t);
      }
    });

    return map;
  }, [clientFilteredTasks]);

  // Calendar matrix calculation
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      deadlines: Task[];
      pendingDeadlines: Task[];
      overdueDeadlines: Task[];
      completedDeadlines: Task[];
    }[] = [];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevDate = new Date(currentYear, currentMonth - 1, day);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dayData = tasksByDate[dateStr] || { deadlines: [], given: [] };
      const deadlines = dayData.deadlines;
      const pendingDeadlines = deadlines.filter((t) => !isDone(t.status));
      const overdueDeadlines = deadlines.filter((t) => isOverdue(t));
      const completedDeadlines = deadlines.filter((t) => isDone(t.status));

      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        deadlines,
        pendingDeadlines,
        overdueDeadlines,
        completedDeadlines
      });
    }

    // Current month days
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const m = String(currentMonth + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      const dateStr = `${currentYear}-${m}-${d}`;
      const dayData = tasksByDate[dateStr] || { deadlines: [], given: [] };
      const deadlines = dayData.deadlines;
      const pendingDeadlines = deadlines.filter((t) => !isDone(t.status));
      const overdueDeadlines = deadlines.filter((t) => isOverdue(t));
      const completedDeadlines = deadlines.filter((t) => isDone(t.status));

      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        deadlines,
        pendingDeadlines,
        overdueDeadlines,
        completedDeadlines
      });
    }

    // Next month filler days (pad to multiple of 7, up to 35 or 42)
    const totalCurrentCells = cells.length;
    const targetLength = totalCurrentCells <= 35 ? 35 : 42;
    const remainingDays = targetLength - totalCurrentCells;

    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(currentYear, currentMonth + 1, day);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dayData = tasksByDate[dateStr] || { deadlines: [], given: [] };
      const deadlines = dayData.deadlines;
      const pendingDeadlines = deadlines.filter((t) => !isDone(t.status));
      const overdueDeadlines = deadlines.filter((t) => isOverdue(t));
      const completedDeadlines = deadlines.filter((t) => isDone(t.status));

      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        deadlines,
        pendingDeadlines,
        overdueDeadlines,
        completedDeadlines
      });
    }

    return cells;
  }, [currentYear, currentMonth, tasksByDate, todayStr, selectedDate]);

  // Month stats
  const monthStats = useMemo(() => {
    const curMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    let monthDeadlines = 0;
    let monthPending = 0;
    let monthOverdue = 0;
    let monthCompleted = 0;

    Object.entries(tasksByDate).forEach(([dateStr, data]) => {
      if (dateStr.startsWith(curMonthPrefix)) {
        monthDeadlines += data.deadlines.length;
        data.deadlines.forEach((t) => {
          if (isDone(t.status)) monthCompleted++;
          else {
            monthPending++;
            if (isOverdue(t)) monthOverdue++;
          }
        });
      }
    });

    return { monthDeadlines, monthPending, monthOverdue, monthCompleted };
  }, [currentYear, currentMonth, tasksByDate]);

  // Selected date events
  const selectedDayData = useMemo(() => {
    const dayData = tasksByDate[selectedDate] || { deadlines: [], given: [] };
    const deadlines = dayData.deadlines;
    const pendingDeadlines = deadlines.filter((t) => !isDone(t.status));
    const overdueDeadlines = deadlines.filter((t) => isOverdue(t));
    const completedDeadlines = deadlines.filter((t) => isDone(t.status));
    return {
      dateStr: selectedDate,
      deadlines,
      given: dayData.given,
      pendingDeadlines,
      overdueDeadlines,
      completedDeadlines
    };
  }, [selectedDate, tasksByDate]);

  // Format nice readable date for header
  const readableSelectedDate = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <div className="calendarSection">
      {/* Top Header & Stats */}
      <div className="calendarHeader">
        <div className="calendarMonthNav">
          <div className="calendarTitleGroup">
            <h2>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
            <span className="calendarSubtext">
              Track deadlines & schedule tasks for specific dates
            </span>
          </div>

          <div className="calendarControls">
            <button className="btn light btnSm" onClick={goToToday} title="Go to today">
              Today
            </button>
            <div className="btnGroup">
              <button className="btn light iconBtnSm" onClick={prevMonth} title="Previous month">
                <ChevronLeft size={16} />
              </button>
              <button className="btn light iconBtnSm" onClick={nextMonth} title="Next month">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Month KPI Cards */}
        <div className="calendarToolbar">
          <div className="calendarFilters">
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="calendarSelect"
            >
              <option value="All clients">All Clients ({clients.length})</option>
              {clients.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <div className="filterPills">
              <button
                className={`filterPill ${viewFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setViewFilter('pending')}
              >
                Pending Deadlines
              </button>
              <button
                className={`filterPill ${viewFilter === 'allDeadlines' ? 'active' : ''}`}
                onClick={() => setViewFilter('allDeadlines')}
              >
                All Deadlines
              </button>
              <button
                className={`filterPill ${viewFilter === 'all' ? 'active' : ''}`}
                onClick={() => setViewFilter('all')}
              >
                All Events
              </button>
            </div>
          </div>

          <div className="calendarMiniStats">
            <div className="miniStatCard">
              <span className="miniStatLabel">Month Deadlines</span>
              <strong className="miniStatValue">{monthStats.monthDeadlines}</strong>
            </div>
            <div className="miniStatCard alert">
              <span className="miniStatLabel">Pending Deadlines</span>
              <strong className="miniStatValue alert">{monthStats.monthPending}</strong>
            </div>
            {monthStats.monthOverdue > 0 && (
              <div className="miniStatCard overdue">
                <span className="miniStatLabel">Overdue</span>
                <strong className="miniStatValue red">{monthStats.monthOverdue}</strong>
              </div>
            )}
            <div className="miniStatCard done">
              <span className="miniStatLabel">Completed</span>
              <strong className="miniStatValue green">{monthStats.monthCompleted}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Calendar View: Grid on left/center, Selected Date details on right */}
      <div className="calendarMainLayout">
        <div className="calendarGridContainer">
          {/* Weekday headers */}
          <div className="calendarWeekdaysRow">
            {WEEKDAYS.map((w, idx) => (
              <div
                key={w}
                className={`calendarWeekdayCell ${idx === 0 || idx === 6 ? 'weekend' : ''}`}
              >
                {w}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="calendarMonthGrid">
            {calendarCells.map((cell) => {
              // Determine what tasks to display in this cell based on filter
              const tasksToShow =
                viewFilter === 'pending'
                  ? cell.pendingDeadlines
                  : viewFilter === 'allDeadlines'
                  ? cell.deadlines
                  : cell.deadlines;

              const hasPending = cell.pendingDeadlines.length > 0;
              const hasOverdue = cell.overdueDeadlines.length > 0;
              const hasCompleted = cell.completedDeadlines.length > 0;

              return (
                <div
                  key={cell.dateStr}
                  className={`calendarDayCell ${!cell.isCurrentMonth ? 'otherMonth' : ''} ${
                    cell.isToday ? 'isToday' : ''
                  } ${cell.isSelected ? 'isSelected' : ''} ${hasPending ? 'hasPending' : ''}`}
                  onClick={() => setSelectedDate(cell.dateStr)}
                >
                  <div className="calendarDayHeader">
                    <span className={`dayNumber ${cell.isToday ? 'todayBadge' : ''}`}>
                      {cell.dayNumber}
                    </span>

                    {/* Quick Add button for this specific day */}
                    <button
                      className="calendarQuickAddBtn"
                      title={`Create task locked to ${cell.dateStr}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateTaskForDate(
                          cell.dateStr,
                          selectedClient !== 'All clients' ? selectedClient : undefined
                        );
                      }}
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Badges / indicators */}
                  <div className="calendarDayIndicators">
                    {hasOverdue && (
                      <span className="cellDot overdue" title={`${cell.overdueDeadlines.length} Overdue deadline(s)`} />
                    )}
                    {hasPending && !hasOverdue && (
                      <span className="cellDot pending" title={`${cell.pendingDeadlines.length} Pending deadline(s)`} />
                    )}
                    {hasCompleted && (
                      <span className="cellDot done" title={`${cell.completedDeadlines.length} Completed task(s)`} />
                    )}
                  </div>

                  {/* Tasks preview chips inside day cell */}
                  <div className="calendarTaskList">
                    {tasksToShow.slice(0, 2).map((t) => {
                      const overdue = isOverdue(t);
                      const done = isDone(t.status);
                      return (
                        <div
                          key={t.id}
                          className={`calendarTaskChip ${
                            done ? 'done' : overdue ? 'overdue' : 'pending'
                          }`}
                          title={`${t.client}: ${t.change} (${t.status})`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTask(t);
                          }}
                        >
                          <span className="chipClient">{t.client}</span>
                          <span className="chipTitle">{t.change}</span>
                        </div>
                      );
                    })}

                    {tasksToShow.length > 2 && (
                      <span className="calendarMoreBadge">
                        +{tasksToShow.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Day Events Inspector Panel */}
        <aside className="calendarDayInspector">
          <div className="inspectorHead">
            <div>
              <div className="inspectorDateLabel">
                <CalendarIcon size={14} /> Selected Date
              </div>
              <h3>{readableSelectedDate}</h3>
              <span className="inspectorSubtext">
                {selectedDate === todayStr ? 'Today • ' : ''}
                {selectedDayData.deadlines.length} task deadline(s) scheduled
              </span>
            </div>

            {/* Create task with locked date button */}
            <button
              className="btn primary btnBlock"
              onClick={() =>
                onCreateTaskForDate(
                  selectedDate,
                  selectedClient !== 'All clients' ? selectedClient : undefined
                )
              }
              title={`Create a task with deadline locked to ${selectedDate}`}
            >
              <Plus size={16} /> Create Task for this Date
            </button>
            <div className="lockNote">
              <Lock size={12} /> Date will be locked to{' '}
              <strong>{formatDisplayDate(selectedDate)}</strong>
            </div>
          </div>

          <div className="inspectorBody">
            <div className="inspectorSectionTitle">
              <span>Task Deadlines on this Date</span>
              <span className="countBadge">{selectedDayData.deadlines.length}</span>
            </div>

            {selectedDayData.deadlines.length === 0 ? (
              <div className="inspectorEmpty">
                <CalendarIcon size={36} className="mutedIcon" />
                <h4>No deadlines on this date</h4>
                <p>
                  Click &ldquo;Create Task for this Date&rdquo; above to schedule a new work request with this locked date.
                </p>
              </div>
            ) : (
              <div className="inspectorTaskList">
                {selectedDayData.deadlines.map((t) => {
                  const overdue = isOverdue(t);
                  const done = isDone(t.status);
                  return (
                    <div
                      key={t.id}
                      className={`inspectorTaskCard ${
                        done ? 'isDone' : overdue ? 'isOverdue' : 'isPending'
                      }`}
                    >
                      <div className="cardTop">
                        <div className="cardMetaGroup">
                          <span className="clientTag">{t.client}</span>
                          <span className={`typeBadge ${(t.type || 'change').toLowerCase()}`}>
                            {t.type || 'Change'}
                          </span>
                        </div>
                        <span
                          className={`pill ${
                            done ? 'done' : overdue ? 'late' : 'progress'
                          }`}
                        >
                          {done ? 'Done' : overdue ? 'Overdue' : t.status || 'Pending'}
                        </span>
                      </div>

                      <h4 className="cardTitle">{t.change}</h4>

                      <div className="cardDates">
                        <span className="dateItem">
                          <Clock size={12} /> Due: <strong>{formatDisplayDate(t.dueDate)}</strong>
                        </span>
                        {t.givenDate && (
                          <span className="dateItem muted">
                            Given: {formatDisplayDate(t.givenDate)}
                          </span>
                        )}
                        {t.assignee && (
                          <span className="dateItem assignee">
                            <User size={12} /> {t.assignee}
                          </span>
                        )}
                      </div>

                      <div className="cardActions">
                        <button
                          className="btn light btnSm"
                          onClick={() => onSelectTask(t)}
                        >
                          Edit Task
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
