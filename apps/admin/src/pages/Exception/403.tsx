import ExceptionPage from './ExceptionPage';

export default function ForbiddenPage() {
  return (
    <ExceptionPage
      status={403}
      title="403"
      subTitle="The current shell permission set cannot open this page."
    />
  );
}
