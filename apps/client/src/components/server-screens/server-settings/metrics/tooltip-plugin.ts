import { format as formatDate } from 'date-fns';
import type uPlot from 'uplot';

const TOOLTIP_OFFSET = 12;

export const tooltipPlugin = (
  getFormat: () => (value: number) => string
): uPlot.Plugin => {
  const tooltip = document.createElement('div');
  const valueEl = document.createElement('div');
  const timeEl = document.createElement('div');

  tooltip.className =
    'pointer-events-none absolute top-2 z-10 hidden whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md';
  valueEl.className = 'font-semibold';
  timeEl.className = 'text-muted-foreground';

  tooltip.append(valueEl, timeEl);

  const hide = () => {
    tooltip.style.display = 'none';
  };

  return {
    hooks: {
      init: (u) => {
        u.over.appendChild(tooltip);
        u.over.addEventListener('mouseleave', hide);
      },
      setCursor: (u) => {
        const { idx, left } = u.cursor;

        if (
          idx === null ||
          idx === undefined ||
          left === undefined ||
          left < 0
        ) {
          hide();

          return;
        }

        const [timestamps, values] = u.data;
        const value = values?.[idx];
        const timestamp = timestamps[idx];

        if (value === null || value === undefined || timestamp === undefined) {
          hide();

          return;
        }

        const format = getFormat();

        valueEl.textContent = format(value);
        timeEl.textContent = formatDate(timestamp * 1000, 'PP pp');
        tooltip.style.display = 'block';

        const overWidth = u.over.clientWidth;
        const tooltipWidth = tooltip.offsetWidth;
        const flip = left + TOOLTIP_OFFSET + tooltipWidth > overWidth;
        const x = flip
          ? left - TOOLTIP_OFFSET - tooltipWidth
          : left + TOOLTIP_OFFSET;

        tooltip.style.left = `${Math.max(0, x)}px`;
      },
      destroy: (u) => {
        u.over.removeEventListener('mouseleave', hide);
      }
    }
  };
};
