import ExceptionPage from './ExceptionPage';
import { useIntl } from '@umijs/max';

export default function ForbiddenPage() {
  const intl = useIntl();

  return (
    <ExceptionPage
      status={403}
      title="403"
      subTitle={intl.formatMessage({
        id: 'pages.403.subTitle',
        defaultMessage:
          'Sorry, your account does not have access to this page.',
      })}
    />
  );
}
