import logging
import sys
from pathlib import Path

# Add project root to the Python path to allow for absolute imports
sys.path.append(str(Path(__file__).resolve().parents[1]))

from app import crud, schemas
from app.db.session import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

yolov5_test_yaml = """# Ultralytics YOLO 🚀, AGPL-3.0 license
# YOLOv5-P5 640-resolution model configuration for COCO dataset

# Parameters
nc: 80  # number of classes
depth_multiple: 0.33  # model depth multiple
width_multiple: 0.50  # layer channel multiple
anchors:
  - [10,13, 16,30, 33,23]  # P3/8
  - [30,61, 62,45, 59,119]  # P4/16
  - [116,90, 156,198, 373,326]  # P5/32

# YOLOv5 v6.0 backbone
backbone:
  # [from, number, module, args]
  [[-1, 1, Conv, [64, 6, 2, 2]],  # 0-P1/2
   [-1, 1, Conv, [128, 3, 2]],  # 1-P2/4
   [-1, 3, C3, [128]],
   [-1, 1, Conv, [256, 3, 2]],  # 3-P3/8
   [-1, 6, C3, [256]],
   [-1, 1, Conv, [512, 3, 2]],  # 5-P4/16
   [-1, 9, C3, [512]],
   [-1, 1, Conv, [1024, 3, 2]],  # 7-P5/32
   [-1, 3, C3, [1024]],
   [-1, 1, SPPF, [1024, 5]],  # 9
  ]

# YOLOv5 v6.0 head
head:
  [[-1, 1, Conv, [512, 1, 1]],
   [-1, 1, nn.Upsample, [None, 2, 'nearest']],
   [[-1, 6], 1, Concat, [1]],  # cat backbone P4
   [-1, 3, C3, [512, False]],  # 13

   [-1, 1, Conv, [256, 1, 1]],
   [-1, 1, nn.Upsample, [None, 2, 'nearest']],
   [[-1, 4], 1, Concat, [1]],  # cat backbone P3
   [-1, 3, C3, [256, False]],  # 17 (P3/8-small)

   [-1, 1, Conv, [256, 3, 2]],
   [[-1, 14], 1, Concat, [1]],  # cat head P4
   [-1, 3, C3, [512, False]],  # 20 (P4/16-medium)

   [-1, 1, Conv, [512, 3, 2]],
   [[-1, 10], 1, Concat, [1]],  # cat head P5
   [-1, 3, C3, [1024, False]],  # 23 (P5/32-large)

   [[17, 20, 23], 1, Detect, [nc, anchors]],  # Detect(P3, P4, P5)
  ]
"""

def init_db() -> None:
    """Initializes the database with seed data."""
    db = SessionLocal()
    try:
        version_in_db = crud.yolo_version.get_by_name(db, name="YOLOv5-test")
        if not version_in_db:
            logger.info("Creating YOLOv5-test version")
            version_in = schemas.YoloVersionCreate(
                name="YOLOv5-test",
                description="A test version of YOLOv5 with a full YAML architecture.",
                architecture=yolov5_test_yaml,
            )
            crud.yolo_version.create(db, obj_in=version_in)
            logger.info("YOLOv5-test version created")
        else:
            logger.info("YOLOv5-test version already exists")
    finally:
        db.close()

def main() -> None:
    """Main function to run the data initialization."""
    logger.info("Initializing data")
    init_db()
    logger.info("Data initialization finished")

if __name__ == "__main__":
    main()
