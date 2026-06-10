import ExceptionPage from './ExceptionPage';

export default function ServerErrorPage() {
  return (
    <ExceptionPage
      status={500}
      title="500"
      subTitle="The admin shell received an unexpected runtime error."
    />
  );
}
