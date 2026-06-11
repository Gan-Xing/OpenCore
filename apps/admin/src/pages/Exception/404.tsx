import ExceptionPage from './ExceptionPage';

export default function NotFoundPage() {
  return (
    <ExceptionPage
      status={404}
      title="404"
      subTitle="This route is not registered in the admin shell."
    />
  );
}
