import ExceptionPage from './ExceptionPage';
import { useIntl } from '@umijs/max';

export default function ServerErrorPage() {
  const intl = useIntl();

  return (
    <ExceptionPage
      status={500}
      title="500"
      subTitle={intl.formatMessage({
        id: 'pages.500.subTitle',
        defaultMessage: 'Sorry, the service is temporarily unavailable.',
      })}
    />
  );
}
