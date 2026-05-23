export const formatTime = (date: string | null) => {
  if (!date) return null;
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const getInitials = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');


export const getAvatarColor = (text: string) => {
  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    '#f44336', // red
    '#e91e63', // pink
    '#9c27b0', // purple
    '#673ab7', // deep purple
    '#3f51b5', // indigo
    '#2196f3', // blue
    '#03a9f4', // light blue
    '#009688', // teal
    '#4caf50', // green
    '#ff9800', // orange
  ];

  return colors[Math.abs(hash) % colors.length];
};