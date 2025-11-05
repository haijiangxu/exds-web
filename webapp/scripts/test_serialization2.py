"""
测试Pydantic模型序列化（无emoji版本）
"""
import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from webapp.services.package_service import PackageService
from webapp.tools.mongo import DATABASE
from webapp.models.retail_package import PackageListResponse

def test_model_serialization():
    """测试模型序列化"""
    print("=" * 50)
    print("Testing Pydantic Model Serialization")
    print("=" * 50)

    service = PackageService(DATABASE)

    # 获取数据
    result = service.list_packages(
        filters={"keyword": None, "package_type": None, "status": None},
        page=1,
        page_size=10
    )

    print(f"\nService result type: {type(result)}")
    print(f"items type: {type(result['items'])}")
    if result['items']:
        print(f"first item type: {type(result['items'][0])}")

    # 尝试创建Pydantic响应模型
    try:
        response_model = PackageListResponse(**result)
        print("\n[OK] PackageListResponse model created")

        # 尝试序列化为JSON
        try:
            json_str = response_model.model_dump_json()
            print(f"[OK] JSON serialization successful, length: {len(json_str)}")

            # 解析JSON验证
            json_obj = json.loads(json_str)
            print(f"[OK] JSON parsing successful")
            print(f"\nFirst 500 chars of JSON:")
            print(json_str[:500])
        except Exception as e:
            print(f"\n[ERROR] JSON serialization failed: {e}")
            import traceback
            traceback.print_exc()

    except Exception as e:
        print(f"\n[ERROR] PackageListResponse model creation failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    try:
        test_model_serialization()
    except Exception as e:
        print(f"\n[ERROR] Test failed: {e}")
        import traceback
        traceback.print_exc()
