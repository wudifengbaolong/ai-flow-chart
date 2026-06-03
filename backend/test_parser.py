"""PUML 解析器测试"""
import sys
sys.path.insert(0, '.')

from app.services.puml_parser import parse_puml, result_to_dict

# 测试用例
tests = [
    # 1. 简单线性流程
    {
        "name": "简单线性流程",
        "puml": """@startuml
start
:读取文件;
:解析数据;
:生成报告;
:发送邮件;
stop
@enduml""",
    },
    # 2. if-else 分支
    {
        "name": "if-else 分支",
        "puml": """@startuml
start
:输入分数;
if (分数 >= 60) then (是)
  :判定及格;
else (否)
  :判定不及格;
endif
:输出结果;
stop
@enduml""",
    },
    # 3. while 循环
    {
        "name": "while 循环",
        "puml": """@startuml
start
:i = 0;
while (i < 10) do (继续)
  :i = i + 1;
  :处理第i条数据;
endwhile (结束)
:输出总数;
stop
@enduml""",
    },
    # 4. 嵌套 if-else
    {
        "name": "嵌套 if-else",
        "puml": """@startuml
start
:输入温度;
if (温度 > 35) then (是)
  :开空调制冷;
else (否)
  if (温度 < 10) then (是)
    :开暖气制热;
  else (否)
    :保持当前状态;
  endif
endif
:记录温度;
stop
@enduml""",
    },
    # 5. for 循环
    {
        "name": "for 循环",
        "puml": """@startuml
start
:计算阶乘;
:i = 1;
:结果 = 1;
for (i <= n) then (继续)
  :结果 = 结果 * i;
  :i = i + 1;
endfor (结束)
:返回结果;
stop
@enduml""",
    },
]

def run_test(test):
    print(f"\n{'='*50}")
    print(f"测试: {test['name']}")
    print(f"{'='*50}")

    result = parse_puml(test['puml'])

    print(f"\n节点数: {len(result.nodes)}")
    print(f"边数: {len(result.edges)}")

    # 检查边
    print("\n边:")
    for e in result.edges:
        src = next((n for n in result.nodes if n.id == e.source), None)
        tgt = next((n for n in result.nodes if n.id == e.target), None)
        if src and tgt:
            print(f"  {src.label}({src.type}) -> {tgt.label}({tgt.type}), type={e.type}")

    # 检查问题
    issues = []
    if len(result.nodes) == 0:
        issues.append("没有节点")
    if len(result.edges) == 0:
        issues.append("没有边")

    # 检查是否有 start 和 end
    has_start = any(n.type == 'start' for n in result.nodes)
    has_end = any(n.type == 'end' for n in result.nodes)
    if not has_start:
        issues.append("缺少 start 节点")
    if not has_end:
        issues.append("缺少 end 节点")

    # 检查回连线（loop）
    has_loop_back = any(e.type == 'default' and
        any(n.type == 'loop' for n in result.nodes if n.id == e.target)
        for e in result.edges)
    if any(n.type == 'loop' for n in result.nodes) and not has_loop_back:
        issues.append("循环节点缺少回连线")

    if issues:
        print(f"\n[FAIL] 问题: {', '.join(issues)}")
    else:
        print(f"\n[PASS] 测试通过")

    return len(issues) == 0

if __name__ == "__main__":
    passed = 0
    for test in tests:
        if run_test(test):
            passed += 1

    print(f"\n{'='*50}")
    print(f"结果: {passed}/{len(tests)} 测试通过")
    print(f"{'='*50}")
