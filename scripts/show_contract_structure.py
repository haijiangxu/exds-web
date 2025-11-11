"""
查看合同表的字段结构
"""

import sys
from pathlib import Path
import json

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from webapp.tools.mongo import DATABASE


def show_contract_structure():
    """显示合同表的字段结构"""

    contracts_collection = DATABASE.retail_contracts

    print("=" * 80)
    print("合同表字段结构")
    print("=" * 80)
    print()

    # 获取一份合同样本
    contract = contracts_collection.find_one()

    if not contract:
        print("合同表中没有数据")
        return

    print("合同字段列表：")
    print("-" * 80)
    for key, value in contract.items():
        value_type = type(value).__name__
        if isinstance(value, str) and len(value) > 50:
            value_preview = value[:50] + "..."
        else:
            value_preview = value
        print(f"  {key:30} {value_type:15} {value_preview}")

    print()
    print("=" * 80)


if __name__ == "__main__":
    show_contract_structure()
