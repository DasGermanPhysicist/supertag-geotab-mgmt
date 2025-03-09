export const MESSAGE_TYPE_MAP: Record<string, string> = {
  '1': 'Heartbeat',
  '4': 'LB-Only Location',
  '5': 'GPS Location',
  '6': 'Wifi Location',
  '7': 'Cell Id Location',
  '8': 'Event Count',
  '20': 'SSF Sensor Data',
  '23': 'Accel and Shock Data'
};

export function getMessageTypeName(msgType: string): string {
  return MESSAGE_TYPE_MAP[msgType] || 'Unknown';
}