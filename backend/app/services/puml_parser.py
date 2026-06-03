import re
import uuid
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ParsedNode:
    id: str
    type: str  # start, end, process, decision, loop, function_call, io
    label: str
    position: dict = field(default_factory=lambda: {"x": 0, "y": 0})


@dataclass
class ParsedEdge:
    id: str
    source: str
    target: str
    label: Optional[str] = None
    type: str = "default"  # yes, no, default


@dataclass
class ParseResult:
    nodes: list[ParsedNode]
    edges: list[ParsedEdge]
    errors: list[str] = field(default_factory=list)


def _gen_id() -> str:
    return f"n{uuid.uuid4().hex[:8]}"


def _gen_edge_id() -> str:
    return f"e{uuid.uuid4().hex[:8]}"


def _strip_comments(lines: list[str]) -> list[str]:
    result = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("'") or stripped.startswith("/'") or stripped.startswith("'/"):
            continue
        if stripped.startswith("note") or stripped.startswith("floating"):
            continue
        result.append(line)
    return result


def parse_puml(puml_text: str) -> ParseResult:
    """Parse PlantUML activity diagram into Graph JSON."""
    nodes: list[ParsedNode] = []
    edges: list[ParsedEdge] = []
    errors: list[str] = []

    # 预处理：将标签内的 \n 转义符替换为占位符，避免被当作换行分割
    # puml_text 中的 \\n 是两个字符（反斜杠+n），需要保留
    processed_text = puml_text.replace("\\n", "\x00NL\x00")
    lines = processed_text.strip().split("\n")
    lines = _strip_comments(lines)
    # 还原占位符
    lines = [line.replace("\x00NL\x00", "\\n") for line in lines]

    # Remove @startuml / @enduml
    clean_lines = []
    has_start = False
    has_end = False
    for line in lines:
        stripped = line.strip()
        if stripped == "@startuml":
            has_start = True
            continue
        if stripped == "@enduml":
            has_end = True
            continue
        if stripped:
            clean_lines.append(stripped)

    if not has_start:
        errors.append("缺少 @startuml 标签")
    if not has_end:
        errors.append("缺少 @enduml 标签")

    if errors:
        return ParseResult(nodes=[], edges=[], errors=errors)

    # Stack for tracking control flow (if/else, while, etc.)
    # Each entry: (node_id, type)
    branch_stack: list[tuple[str, str]] = []
    # Pending connections: list of node_ids waiting to connect to next node
    pending_connections: list[str] = []
    # Pending yes/no edges from decision nodes
    pending_yes_edges: list[tuple[str, Optional[str]]] = []  # (decision_id, target_id)
    pending_no_edges: list[tuple[str, Optional[str]]] = []   # (decision_id, target_id)
    # Last node in current flow
    last_node_id: Optional[str] = None
    # Decision node waiting for branches
    current_decision: Optional[str] = None
    # Track if we're in else branch
    in_else_branch = False
    # Loop node
    current_loop: Optional[str] = None
    # 标记当前分支是否已经遇到 stop/end（已终止）
    branch_has_stop = False
    # 当分支内遇到 stop 时，记录 stop 前一个节点作为汇合点
    merge_node_id: Optional[str] = None
    # 记录所有已终止的节点（遇到 stop/end 的前一个节点）
    terminated_nodes: set[str] = set()
    # 记录所有已终止的节点（遇到 stop/end 的前一个节点）
    terminated_nodes: set[str] = set()

    y_pos = 0
    y_step = 80

    def add_node(type_: str, label: str, x: int = 0) -> ParsedNode:
        nonlocal y_pos
        node = ParsedNode(
            id=_gen_id(),
            type=type_,
            label=label,
            position={"x": x, "y": y_pos},
        )
        nodes.append(node)
        y_pos += y_step
        return node

    def connect(source_id: str, target_id: str, label: Optional[str] = None, edge_type: str = "default"):
        # 不连接已终止的节点
        if source_id in terminated_nodes:
            return
        edge = ParsedEdge(
            id=_gen_edge_id(),
            source=source_id,
            target=target_id,
            label=label,
            type=edge_type,
        )
        edges.append(edge)

    def flush_pending(target_id: str):
        nonlocal pending_connections, pending_yes_edges, pending_no_edges
        for pid in pending_connections:
            connect(pid, target_id)
        pending_connections = []
        # 处理 yes/no 分支边
        for decision_id, branch_target in pending_yes_edges:
            if branch_target is None:
                # 空分支，直接连接到合并点
                connect(decision_id, target_id, edge_type="yes")
        for decision_id, branch_target in pending_no_edges:
            if branch_target is None:
                # 空分支，直接连接到合并点
                connect(decision_id, target_id, edge_type="no")
        pending_yes_edges = []
        pending_no_edges = []

    i = 0
    while i < len(clean_lines):
        line = clean_lines[i]
        stripped = line.strip()

        # start
        if stripped == "start":
            node = add_node("start", "开始")
            if last_node_id:
                connect(last_node_id, node.id)
            flush_pending(node.id)
            last_node_id = node.id
            i += 1
            continue

        # stop / end
        if stripped in ("stop", "end"):
            node = add_node("end", "结束")
            # 记录 stop 前的节点作为汇合点
            if last_node_id and last_node_id != current_decision:
                merge_node_id = last_node_id
                terminated_nodes.add(last_node_id)
            if last_node_id:
                connect(last_node_id, node.id)
            flush_pending(node.id)
            last_node_id = node.id
            # 标记当前分支已终止
            if current_decision or branch_stack:
                branch_has_stop = True
            i += 1
            continue

        # Activity: :label;
        activity_match = re.match(r'^:(.+?);$', stripped)
        if activity_match:
            label = activity_match.group(1).strip()
            # Detect function calls
            if re.match(r'^\w+\(.*\)$', label):
                node = add_node("function_call", label)
            else:
                node = add_node("process", label)
            if last_node_id and last_node_id not in terminated_nodes:
                # 如果上一个节点是决策节点，根据当前分支设置边类型和标签
                edge_type = "default"
                edge_label = None
                if last_node_id == current_decision:
                    if in_else_branch:
                        edge_type = "no"
                        edge_label = "否"
                    else:
                        edge_type = "yes"
                        edge_label = "是"
                connect(last_node_id, node.id, edge_type=edge_type, label=edge_label)
            # 在 if/else 块内部不 flush pending，等 endif 后再统一连接
            in_decision_block = any(s[1] == "decision" for s in branch_stack)
            if not in_decision_block:
                flush_pending(node.id)
            last_node_id = node.id
            i += 1
            continue

        # if (condition) then (yes_label)
        if_match = re.match(r'^if\s*\((.+?)\)\s*then\s*\((.+?)\)$', stripped)
        if if_match:
            condition = if_match.group(1).strip()
            yes_label = if_match.group(2).strip()
            node = add_node("decision", condition)
            if last_node_id:
                # 嵌套 if 时，上一个节点可能是外层 decision，需要设置边类型
                edge_type = "default"
                edge_label = None
                if last_node_id == current_decision:
                    if in_else_branch:
                        edge_type = "no"
                        edge_label = "否"
                    else:
                        edge_type = "yes"
                        edge_label = "是"
                connect(last_node_id, node.id, edge_type=edge_type, label=edge_label)
            flush_pending(node.id)
            current_decision = node.id
            in_else_branch = False
            branch_stack.append((node.id, "decision"))
            last_node_id = node.id
            i += 1
            continue

        # else (no_label)
        else_match = re.match(r'^else\s*\((.+?)\)$', stripped)
        if else_match:
            no_label = else_match.group(1).strip()
            if current_decision:
                in_else_branch = True
                # The last node in yes branch needs to connect to the merge point later
                if last_node_id and last_node_id != current_decision:
                    # 如果 yes 分支遇到了 stop，说明分支已终止，不需要连接到合并点
                    if not branch_has_stop:
                        pending_connections.append(last_node_id)
                    # 记录 yes 分支的边
                    pending_yes_edges.append((current_decision, last_node_id))
                else:
                    # yes 分支为空，标记需要直接连接到合并点
                    pending_yes_edges.append((current_decision, None))
                last_node_id = current_decision
                # 不重置 branch_has_stop，保留 yes 分支的状态
            i += 1
            continue

        # elseif (condition) then (label) 或 else if (condition) then (label)
        elseif_match = re.match(r'^(?:else\s*)?elseif\s*\((.+?)\)\s*then\s*\((.+?)\)$', stripped)
        if not elseif_match:
            elseif_match = re.match(r'^else\s+if\s*\((.+?)\)\s*then\s*\((.+?)\)$', stripped)
        if elseif_match:
            condition = elseif_match.group(1).strip()
            yes_label = elseif_match.group(2).strip()
            # 先处理 else 分支
            if current_decision:
                in_else_branch = True
                if last_node_id and last_node_id != current_decision:
                    if not branch_has_stop:
                        pending_connections.append(last_node_id)
                    pending_yes_edges.append((current_decision, last_node_id))
                else:
                    pending_yes_edges.append((current_decision, None))
                last_node_id = current_decision
            # 再创建新的 decision 节点
            node = add_node("decision", condition)
            if last_node_id:
                edge_type = "no" if in_else_branch else "default"
                edge_label = "否" if in_else_branch else None
                connect(last_node_id, node.id, edge_type=edge_type, label=edge_label)
            flush_pending(node.id)
            current_decision = node.id
            in_else_branch = False
            branch_stack.append((node.id, "decision"))
            last_node_id = node.id
            i += 1
            continue

        # endif
        if stripped == "endif":
            if branch_stack and branch_stack[-1][1] == "decision":
                branch_stack.pop()
                if last_node_id and last_node_id != current_decision:
                    # 如果有汇合点（yes 分支遇到了 stop），连接 no 分支到汇合点
                    if merge_node_id:
                        connect(last_node_id, merge_node_id, edge_type="default")
                    elif not branch_has_stop:
                        pending_connections.append(last_node_id)
                    # 记录 no 分支的边
                    pending_no_edges.append((current_decision, last_node_id))
                else:
                    # no 分支为空，标记需要直接连接到合并点
                    pending_no_edges.append((current_decision, None))
                current_decision = None
                in_else_branch = False
                branch_has_stop = False
                merge_node_id = None
                last_node_id = None  # Will be set by next node
            i += 1
            continue

        # while (condition) do (label) - 支持 do (label) 后缀
        while_match = re.match(r'^while\s*\((.+?)\)(?:\s+do\s*\((.+?)\))?$', stripped)
        if while_match:
            condition = while_match.group(1).strip()
            node = add_node("loop", condition)
            if last_node_id:
                connect(last_node_id, node.id)
            flush_pending(node.id)
            current_loop = node.id
            branch_stack.append((node.id, "loop"))
            last_node_id = node.id
            i += 1
            continue

        # repeat - repeat while 循环开始
        if stripped == "repeat":
            node = add_node("loop", "循环")
            if last_node_id:
                connect(last_node_id, node.id)
            flush_pending(node.id)
            current_loop = node.id
            branch_stack.append((node.id, "loop"))
            last_node_id = node.id
            i += 1
            continue

        # endwhile (label) - 循环结束，回连线回到循环条件
        if stripped.startswith("endwhile"):
            if branch_stack and branch_stack[-1][1] == "loop":
                loop_node_id = branch_stack.pop()[0]
                if last_node_id:
                    connect(last_node_id, loop_node_id)
                current_loop = None
                # endwhile 后的节点连接到循环条件节点（循环继续时的出口）
                last_node_id = loop_node_id
            i += 1
            continue

        # repeat while (condition) - repeat 循环结束
        repeat_while_match = re.match(r'^repeat\s+while\s*\((.+?)\)$', stripped)
        if repeat_while_match:
            if branch_stack and branch_stack[-1][1] == "loop":
                loop_node_id = branch_stack.pop()[0]
                # 更新循环节点的标签为条件
                condition = repeat_while_match.group(1).strip()
                for n in nodes:
                    if n.id == loop_node_id:
                        n.label = condition
                        break
                if last_node_id:
                    connect(last_node_id, loop_node_id)
                current_loop = None
                last_node_id = loop_node_id
            i += 1
            continue

        # for (condition) then/do (label) - 支持 then/do 后缀
        for_match = re.match(r'^for\s*\((.+?)\)(?:\s+(?:then|do)\s*\((.+?)\))?$', stripped)
        if for_match:
            condition = for_match.group(1).strip()
            node = add_node("loop", condition)
            if last_node_id:
                connect(last_node_id, node.id)
            flush_pending(node.id)
            current_loop = node.id
            branch_stack.append((node.id, "loop"))
            last_node_id = node.id
            i += 1
            continue

        # endfor (label) - 循环结束，回连线回到循环条件
        if stripped.startswith("endfor"):
            if branch_stack and branch_stack[-1][1] == "loop":
                loop_node_id = branch_stack.pop()[0]
                if last_node_id:
                    connect(last_node_id, loop_node_id)
                current_loop = None
                last_node_id = loop_node_id
            i += 1
            continue

        # Partition / group - skip
        if stripped.startswith("partition") or stripped.startswith("group"):
            i += 1
            continue

        # end partition / end group
        if stripped.startswith("end") and ("partition" in stripped or "group" in stripped):
            i += 1
            continue

        # Fallback: treat as process
        if stripped and not stripped.startswith("@") and not stripped.startswith("title"):
            node = add_node("process", stripped)
            if last_node_id and last_node_id not in terminated_nodes:
                connect(last_node_id, node.id)
            flush_pending(node.id)
            last_node_id = node.id

        i += 1

    # Connect any remaining pending connections to end
    if pending_connections:
        # 找到最后一个结束节点
        end_nodes = [n for n in nodes if n.type == "end"]
        target_id = last_node_id or (end_nodes[-1].id if end_nodes else None)
        if target_id:
            for pid in pending_connections:
                if pid != target_id:
                    connect(pid, target_id)

    # Remove duplicate edges (保留不同 type 的边)
    seen_edges: set[tuple[str, str, str]] = set()
    unique_edges: list[ParsedEdge] = []
    for edge in edges:
        key = (edge.source, edge.target, edge.type)
        if key not in seen_edges:
            seen_edges.add(key)
            unique_edges.append(edge)

    return ParseResult(
        nodes=[ParsedNode(id=n.id, type=n.type, label=n.label, position=n.position) for n in nodes],
        edges=[ParsedEdge(id=e.id, source=e.source, target=e.target, label=e.label, type=e.type) for e in unique_edges],
        errors=errors,
    )


def result_to_dict(result: ParseResult) -> dict:
    """Convert ParseResult to API response dict."""
    return {
        "graph": {
            "nodes": [
                {"id": n.id, "type": n.type, "label": n.label, "position": n.position}
                for n in result.nodes
            ],
            "edges": [
                {"id": e.id, "source": e.source, "target": e.target, "label": e.label, "type": e.type}
                for e in result.edges
            ],
        },
        "errors": result.errors,
    }
