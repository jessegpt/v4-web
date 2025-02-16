import { useState } from 'react';
import { shallowEqual, useSelector } from 'react-redux';
import styled, { type AnyStyledComponent, css } from 'styled-components';
import { curveMonotoneX, curveStepAfter } from '@visx/curve';

import { ButtonSize } from '@/constants/buttons';
import { FundingRateResolution, type FundingChartDatum } from '@/constants/charts';
import { STRING_KEYS } from '@/constants/localization';
import { FundingDirection } from '@/constants/markets';
import { SMALL_PERCENT_DECIMALS, TINY_PERCENT_DECIMALS } from '@/constants/numbers';
import { useBreakpoints, useStringGetter } from '@/hooks';

import { breakpoints } from '@/styles';

import { Output, OutputType } from '@/components/Output';
import { LoadingSpace } from '@/components/Loading/LoadingSpinner';
import { ToggleGroup } from '@/components/ToggleGroup';

import { TimeSeriesChart } from '@/components/visx/TimeSeriesChart';
import { AxisLabelOutput } from '@/components/visx/AxisLabelOutput';
import type { TooltipContextType } from '@visx/xychart';

import { calculateFundingRateHistory } from '@/state/perpetualsCalculators';

import { MustBigNumber } from '@/lib/numbers';
import { FundingChartTooltipContent } from './Tooltip';

const FUNDING_RATE_TIME_RESOLUTION = 60 * 60 * 1000; // 1 hour

const getAllFundingRates = (oneHourRate: number = 0) => ({
  [FundingRateResolution.OneHour]: oneHourRate,
  [FundingRateResolution.EightHour]: MustBigNumber(oneHourRate).times(8).toNumber(),
  [FundingRateResolution.Annualized]: MustBigNumber(oneHourRate)
    .times(24 * 365)
    .toNumber(),
});

type ElementProps = {
  selectedLocale: string;
};

export const FundingChart = ({ selectedLocale }: ElementProps) => {
  // Context
  const { isMobile } = useBreakpoints();
  const stringGetter = useStringGetter();

  // Chart data
  const data = useSelector(calculateFundingRateHistory, shallowEqual) as FundingChartDatum[];

  const latestDatum = data?.[data.length - 1];

  // Chart state
  const [fundingRateView, setFundingRateView] = useState(FundingRateResolution.OneHour);

  const [tooltipContext, setTooltipContext] = useState<TooltipContextType<FundingChartDatum>>();

  // Computations
  const latestFundingRate =
    latestDatum && getAllFundingRates(latestDatum.fundingRate)[fundingRateView];

  return (
    <TimeSeriesChart
      id="funding-chart"
      selectedLocale={selectedLocale}
      data={data}
      yAxisScaleType="symlog"
      margin={{
        left: isMobile ? 0 : 88,
        right: 0,
        top: 60,
        bottom: 32,
      }}
      padding={{
        left: 0.025,
        right: 0.025,
        top: 0.05,
        bottom: 0.05,
      }}
      series={[
        {
          dataKey: 'funding-rate',
          xAccessor: (datum) => datum?.time,
          yAccessor: (datum) => datum?.fundingRate,
          colorAccessor: () => 'var(--color-text-1)',
          getCurve: ({ zoom }) => (zoom > 12 ? curveMonotoneX : curveStepAfter),
        },
      ]}
      tickFormatY={(value) =>
        `${(getAllFundingRates(value)[fundingRateView] * 100).toFixed(SMALL_PERCENT_DECIMALS)}%`
      }
      renderXAxisLabel={({ tooltipData }) => {
        const tooltipDatum = tooltipData!.nearestDatum?.datum ?? latestDatum;

        return <Styled.XAxisLabelOutput type={OutputType.DateTime} value={tooltipDatum.time} />;
      }}
      renderYAxisLabel={({ tooltipData }) => {
        const tooltipDatum = tooltipData!.nearestDatum?.datum ?? latestDatum;

        return (
          <Styled.YAxisLabelOutput
            type={OutputType.SmallPercent}
            value={getAllFundingRates(tooltipDatum.fundingRate)[fundingRateView]}
            accentColor={
              {
                [FundingDirection.ToLong]: 'var(--color-negative)',
                [FundingDirection.ToShort]: 'var(--color-positive)',
                [FundingDirection.None]: 'var(--color-layer-6)',
              }[tooltipDatum.direction]
            }
          />
        );
      }}
      renderTooltip={({ tooltipData }) => (
        <FundingChartTooltipContent
          fundingRateView={fundingRateView}
          tooltipData={tooltipData}
          latestDatum={latestDatum}
        />
      )}
      onTooltipContext={(tooltipContext) => setTooltipContext(tooltipContext)}
      minZoomDomain={FUNDING_RATE_TIME_RESOLUTION * 4}
      numGridLines={1}
      slotEmpty={<LoadingSpace id="funding-chart-loading" />}
    >
      <Styled.FundingRateToggle>
        <ToggleGroup
          items={Object.keys(FundingRateResolution).map((rate: string) => ({
            value: rate as FundingRateResolution,
            label:
              {
                [FundingRateResolution.OneHour]: stringGetter({
                  key: STRING_KEYS.RATE_1H,
                }),
                [FundingRateResolution.EightHour]: stringGetter({
                  key: STRING_KEYS.RATE_8H,
                }),
                [FundingRateResolution.Annualized]: stringGetter({
                  key: STRING_KEYS.ANNUALIZED,
                }),
              }[rate] || '',
          }))}
          value={fundingRateView}
          onValueChange={setFundingRateView}
          size={ButtonSize.XSmall}
        />
      </Styled.FundingRateToggle>

      <Styled.CurrentFundingRate isShowing={!tooltipContext?.tooltipOpen}>
        <h4>
          {
            {
              [FundingRateResolution.OneHour]: stringGetter({
                key: STRING_KEYS.CURRENT_RATE_1H,
              }),
              [FundingRateResolution.EightHour]: stringGetter({
                key: STRING_KEYS.CURRENT_RATE_8H,
              }),
              [FundingRateResolution.Annualized]: stringGetter({
                key: STRING_KEYS.CURRENT_ANNUALIZED_RATE,
              }),
            }[fundingRateView]
          }
        </h4>
        <Styled.Output
          type={OutputType.SmallPercent}
          value={latestFundingRate}
          fractionDigits={TINY_PERCENT_DECIMALS}
          isNegative={latestFundingRate < 0}
        />
      </Styled.CurrentFundingRate>
    </TimeSeriesChart>
  );
};

const Styled: Record<string, AnyStyledComponent> = {};

Styled.FundingRateToggle = styled.div`
  place-self: start end;
  isolation: isolate;

  margin: 1rem;
`;

Styled.CurrentFundingRate = styled.div<{ isShowing?: boolean }>`
  place-self: start center;
  padding: clamp(1.5rem, 9rem - 15%, 4rem);
  pointer-events: none;

  font: var(--font-large-book);

  background: radial-gradient(50% 50% at 50% 50%, var(--color-layer-2) 35%, transparent);
  border-radius: 50%;

  text-align: center;

  /* Hover-based */
  /*
  transition: opacity var(--ease-out-expo) 0.25s 0.3s;

  ${Styled.TimeSeriesChart}:hover ${Styled.FundingRateToggle}:not(:hover) + & {
    opacity: 0;
    transition-delay: 0s;
  }
  */

  /* Tooltip state-based */
  transition: opacity var(--ease-out-expo) 0.25s;
  ${({ isShowing }) =>
    !isShowing &&
    css`
      opacity: 0;
    `}

  @media ${breakpoints.mobile} {
    place-self: start start;
    text-align: start;
    padding: 1.25rem;
  }

  h4 {
    font: var(--font-small-medium);
    color: var(--color-text-0);
  }
`;

Styled.Output = styled(Output)<{ isNegative?: boolean }>`
  color: ${({ isNegative }) => (isNegative ? `var(--color-negative)` : `var(--color-positive)`)};
`;

Styled.XAxisLabelOutput = styled(AxisLabelOutput)`
  box-shadow: 0 0 0.5rem var(--color-layer-2);
`;

Styled.YAxisLabelOutput = styled(AxisLabelOutput)`
  --axisLabel-offset: 0.5rem;

  [data-side='left'] & {
    translate: calc(-50% - var(--axisLabel-offset)) 0;

    @media ${breakpoints.mobile} {
      translate: calc(50% + var(--axisLabel-offset)) 0;
    }
  }

  [data-side='right'] & {
    translate: calc(-50% - var(--axisLabel-offset)) 0;
  }
`;
