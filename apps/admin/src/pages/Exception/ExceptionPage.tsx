import { ArrowLeftOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Result } from 'antd';

type ExceptionPageProps = {
  status: 403 | 404 | 500;
  title: string;
  subTitle: string;
};

const ExceptionPage: React.FC<ExceptionPageProps> = ({
  status,
  title,
  subTitle,
}) => {
  return (
    <PageContainer title={title}>
      <Result
        status={status}
        title={title}
        subTitle={subTitle}
        extra={
          <Button
            icon={<ArrowLeftOutlined />}
            type="primary"
            onClick={() => history.push('/dashboard')}
          >
            Dashboard
          </Button>
        }
      />
    </PageContainer>
  );
};

export default ExceptionPage;
