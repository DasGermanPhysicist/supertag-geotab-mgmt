import React, { useState } from 'react';
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Calendar as CalendarIcon, RefreshCw } from 'lucide-react';

interface EventDateRangeSelectorProps {
  dateRange: Date[];
  onDateRangeChange: (e: any) => void;
  onRefresh: () => Promise<void>;
  loading: boolean;
  selectedMsgType: string | null;
  onMsgTypeChange: (type: string | null) => void;
  msgTypeOptions: Array<{ label: string; value: string }>;
}

export function EventDateRangeSelector({
  dateRange,
  onDateRangeChange,
  onRefresh,
  loading,
  selectedMsgType,
  onMsgTypeChange,
  msgTypeOptions
}: EventDateRangeSelectorProps) {
  const [calendarVisible, setCalendarVisible] = useState(false);

  // Helper function to format date for display
  const formatDateDisplay = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleString(undefined, {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format the display text for the date range
  const getDateRangeDisplayText = () => {
    if (!dateRange || dateRange.length === 0) return 'Select date range';
    
    if (dateRange.length === 1 || !dateRange[1]) {
      return formatDateDisplay(dateRange[0]);
    }
    
    return `${formatDateDisplay(dateRange[0])} - ${formatDateDisplay(dateRange[1])}`;
  };

  return (
    <div className="p-fluid grid formgrid">
      <div className="field col-12 md:col-6">
        <label htmlFor="dateRange" className="font-medium">Event Date Range</label>
        <div className="p-inputgroup">
          <span className="p-inputgroup-addon">
            <CalendarIcon className="h-4 w-4" />
          </span>
          <Calendar
            id="dateRange"
            value={dateRange}
            onChange={onDateRangeChange}
            selectionMode="range"
            readOnlyInput
            showIcon
            showTime
            hourFormat="24"
            className="w-full"
            numberOfMonths={2}
            inline={false}
            touchUI={false}
            appendTo="self"
            placeholder="Select date range"
            showButtonBar
            panelClassName="date-range-panel"
            inputClassName="date-range-input"
            visible={calendarVisible}
            onShow={() => setCalendarVisible(true)}
            onHide={() => setCalendarVisible(false)}
            showOnFocus={true}
            dateFormat="MM/dd/yy"
            monthNavigator
            yearNavigator
            yearRange="2020:2030"
            style={{ display: 'block' }}
          />
          <Button
            label="Refresh"
            icon={<RefreshCw className="h-4 w-4 mr-2" />}
            onClick={onRefresh}
            loading={loading}
            className="p-button-primary"
          />
        </div>
        
        {/* Display selected range information for clarity */}
        <div className="text-sm text-gray-600 mt-1">
          {dateRange && dateRange.length > 0 && (
            <span>
              Selected: <span className="font-medium">{getDateRangeDisplayText()}</span>
            </span>
          )}
        </div>
      </div>
      
      <div className="field col-12 md:col-4">
        <label htmlFor="msgTypeFilter" className="font-medium">Filter by Message Type</label>
        <Dropdown
          id="msgTypeFilter"
          options={msgTypeOptions}
          value={selectedMsgType}
          onChange={(e) => onMsgTypeChange(e.value)}
          filter
          placeholder="Select Event Type"
          className="w-full"
        />
      </div>
    </div>
  );
}