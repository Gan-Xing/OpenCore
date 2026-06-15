import ExceptionPage from './ExceptionPage';
import { useIntl } from '@umijs/max';

export default function NotFoundPage() {
  const intl = useIntl();

  return (
    <ExceptionPage
      status={404}
      title="404"
      subTitle={intl.formatMessage({
        id: 'pages.404.subTitle',
        defaultMessage: 'Sorry, the page you visited does not exist.',
      })}
    />
  );
}
