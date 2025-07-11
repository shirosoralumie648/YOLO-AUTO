"""Create yolo_version table

Revision ID: a7daccc22ddc
Revises: 
Create Date: 2025-06-26 01:00:07.858282

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7daccc22ddc'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('yoloversion',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('repo_url', sa.String(), nullable=True),
    sa.Column('paper_url', sa.String(), nullable=True),
    sa.Column('default_input_size', sa.String(), nullable=True),
    sa.Column('performance_metrics', sa.JSON(), nullable=True),
    sa.Column('config_schema', sa.JSON(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_yoloversion_id'), 'yoloversion', ['id'], unique=False)
    op.create_index(op.f('ix_yoloversion_name'), 'yoloversion', ['name'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_yoloversion_name'), table_name='yoloversion')
    op.drop_index(op.f('ix_yoloversion_id'), table_name='yoloversion')
    op.drop_table('yoloversion')
    # ### end Alembic commands ###
