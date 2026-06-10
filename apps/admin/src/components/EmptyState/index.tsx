import { Empty, Typography } from 'antd';

type EmptyStateProps = {
  title: string;
  description?: string;
};

const EmptyState: React.FC<EmptyStateProps> = ({ title, description }) => {
  return (
    <div style={{ padding: '24px 0' }}>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Typography.Text type="secondary">
            {description ?? title}
          </Typography.Text>
        }
      />
    </div>
  );
};

export default EmptyState;
