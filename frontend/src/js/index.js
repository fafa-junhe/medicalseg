import $ from "jquery";
import { Niivue } from "@niivue/niivue";
import { themeChange } from "theme-change";
import * as echarts from "echarts";
import 'echarts-wordcloud'

var patients = [];
var OrderBy = "";
var filterPatient = "a=a";
var records = [];
var lastTask = [];
var newTask = false;
var newRecord = false;
themeChange();
console.log($);
let selectedFiles = [];
var nv = new Niivue({
  isResizeCanvas: false,
  onLocationChange: handleLocationChange,
  backColor: [0.3, 0.3, 0.3, 1],
});
nv.loadingText = "Loading";
nv.attachTo("gl");
let backendServer = "";
console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV !== "production") {
  console.log("Looks like we are in development mode!");
  backendServer = "http://localhost:5000";
}
function handleLocationChange(data) {
  document.getElementById("location").innerHTML = "&nbsp;&nbsp;" + data.string;
}

function previewData(Imageid){
  // 预览医疗数据
  $("#windows-data-info").removeClass("hidden");
  let volumeList = [
    {
      url: `${backendServer}/download/medical_data/${Imageid}.nii.gz`,
      cal_min: 0.0,
      cal_max: 200.0,
      trustCalMinMax: false,
    },
  ];
  nv.setRadiologicalConvention(false);
  nv.loadVolumes(volumeList);
  nv.setRadiologicalConvention(true);
  nv.setClipPlane([0.1, 270, 0]);
  nv.updateGLVolume();
  setTimeout(function () {
    nv.loadDrawingFromUrl(`${backendServer}/download/label_data/${Imageid}.nii.gz`);
    nv.updateGLVolume();
  }, 2000);
  console.log(nv);
  let cmap = {
    R: [0, 0, 185, 185, 252, 0, 103, 216, 127, 127, 0, 222],
    G: [0, 20, 102, 102, 0, 255, 76, 132, 0, 127, 255, 154],
    B: [0, 152, 83, 83, 0, 0, 71, 105, 127, 0, 255, 132],
    A: [0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255],
    labels: [
      "背景",
      "脾脏",
      "右肾",
      "左肾",
      "胆囊",
      "食道",
      "肝脏",
      "胃",
      "主动脉",
      "下腔静脉",
      "胰腺",
      "膀胱",
    ],
  };
  nv.setDrawColormap(cmap);
  resizeCanvas();
  nv.resizeListener();

}
$("body").on("click", ".data-preview-btn", function () {
  let id = $(this).closest("tr").attr("data").split(";")[0];
  previewData(id);
});
function resizeCanvas() {
  let canvas = $("#gl")[0];
  canvas.width = canvas.offsetWidth;
  canvas.height = window.innerHeight - 0.2 * window.innerHeight;
}

$("#drag-select").on("click", "a", function () {
  console.log($(this));
  switch (this.id) {
    case "drag-none":
      nv.opts.dragMode = nv.dragModes.none;
      break;
    case "drag-measurement":
      nv.opts.dragMode = nv.dragModes.measurement;
      break;
    case "drag-pan":
      nv.opts.dragMode = nv.dragModes.pan;
      break;
    case "drag-contrast":
      nv.opts.dragMode = nv.dragModes.contrast;
      break;
  }
  $("#drag-select").toggle();
});

$(window).on("resize", resizeCanvas);
$("body").on("click", ".data-delete-btn", function () {
  // 删除医疗数据
  let id = $(this).closest("tr").attr("data").split(";")[0];
  $.ajax({
    url: `${backendServer}/delete/${id}`,
    success: function () {
      reload();
    },
    error: function (data) {
      if (ap.responseText !== undefined) {
        alert(
          data.responseText,
          "warning",
          `<i class="fi fi-rr-exclamation" aria-hidden="true"></i>`
        );
      } else {
        alert(
          "未知错误",
          "error",
          `<i class="fi fi-rr-exclamation" aria-hidden="true"></i>`
        );
      }
    },
  });
});

function alert(
  msg,
  type = "success",
  icon = `<i class="fi fi-rr-exclamation" aria-hidden="true"></i>`
) {
  // 弹出提示框
  $("#alert")[0].innerHTML = `<span>${icon + msg}</span>`;
  $("#alert")[0].classList.remove(
    "alert-success",
    "alert-error",
    "alert-warning",
    "alert-info"
  );
  $("#alert")[0].classList.add("alert-" + type);

  $("#alert")[0].style["top"] = "3rem";
  setTimeout(function () {
    $("#alert")[0].style["top"] = "-5rem";
  }, 5000);
}

function reload() {
  // 刷新数据
  $(".refresh-btn").each(function () {
    $(this).addClass("loading");
    $(this).html("刷新");
  });
  reloadDataTable();
}


function gotoTab(tab) {
  // 前往某个页面
  $(".drawer-tab").each(function () {
    this.classList.remove("active");
    $("#" + this.id.replace("-drawer", "") + "-tab")[0].classList.add("hidden");
  });
  if (tab == "dashboard") {
    $(".navbar").addClass("hidden");
  }
  else{
    $(".navbar").removeClass("hidden");
  }

  location.hash = tab;
  $(`#${tab}-drawer`)[0].classList.add("active");
  $(`#${tab}-tab`)[0].classList.remove("hidden");
}

$(function () {
  let hash = location.hash.replace("#", ""); // 获取url里的标签
  if (hash != "") {
    gotoTab(hash);
  }
  reload();
});

$(".drawer-tab").on("click", function () {
  gotoTab(this.id.replace("-drawer", ""));
});

$("#select-data-btn").on("click", function () {
  $("#upload-data-input").trigger("click");
});

$(".dropdown-sub").on("mouseover", function () {
  $(this).addClass("active");
  $(this).children("ul").css("display", "block");
});

$("#home-button").on("click", function () {
  gotoTab("root");
});

$(".dropdown-sub").on("mouseout", function () {
  $(this).removeClass("active");
  $(this).children("ul").css("display", "none");
});
$("#remove-upload-data-btn").on("click", function () {});

function getFileType(filePath) {
  const parts = filePath.split("/");
  const fileName = parts[parts.length - 1];
  const fileNameParts = fileName.split(".");
  const fileType = fileNameParts.slice(1, fileNameParts.length).join(".");
  return fileType;
}

function reloadDataTable() {
  // 刷新医疗数据
  $("#data-tables")[0].classList.add(
    "blur",
    "cursor-not-allowed",
    "select-none"
  ); // 添加模糊、禁用效果
  $(".data-checkbox").prop("checked", false); // 取消所有复选框的选中状态

  $.ajax({
    url: `${backendServer}/get/medical_data`,
    dataType: "json",
    success: function (data) {
      $(".refresh-btn").removeClass("loading");
      $(".refresh-btn").html("⭯ 刷新");
      $("#data-table").empty();
      if (data.length == 0) {
        $("#data-table-empty-tip")[0].classList.remove("hidden");
        return;
      }

      for (const i of data) {
        console.log(i);
        $(`             
          <tr class="hover" data="${i.id};${i.file_path};${i.create_time};${
          i.file_size
        };${i.has_label}">
              <th>
                  <input id="data-checkbox-${
                    i.id
                  }" type="checkbox" class="checkbox-sm data-checkbox checkbox" />
              </th>
              <td>
                ${i.id}
              </td>
              <td>
              <img  class="m-auto w-36 h-36" src="${backendServer}/download/thumbnail/${
          i.id
        }.png" />
              </td>
              <td class="text-start whitespace-pre-wrap">
对应患者: <a class="${i.patient != "未知" ? `link-accent link link-search-patient` : ``}" title="点击跳转到对应的患者">${i.patient}</a>
医生诊断: 无
已有标签: ${i.has_label ? "是" : "否"}
文件占用大小: ${parseFloat(i.file_size / 1024 / 1024).toPrecision(3)} MB
上传时间: ${i.create_time}
<div class="join flex justify-start">
<button class="join-item data-preview-btn btn btn-accent btn-xs">修改标签</button>
<button class="join-item upload-label-btn btn btn-primary btn-xs">上传标签</button>
<button class="join-item generate-label-btn btn btn-secondary btn-xs">重新生成标签</button>
<button class="join-item download-data-btn btn-info btn-xs">下载到本地</button>
<button class="join-item data-delete-btn btn btn-error btn-outline btn-xs">删除</button>
</div>
</td>
          </tr>`).appendTo("#data-table");
      }
      $("#data-tables")[0].classList.remove(
        "blur",
        "cursor-not-allowed",
        "select-none"
      );
      $("#data-table-empty-tip")[0].classList.add("hidden");

      $(".data-checkbox").on("click", function () {
        const id = parseInt(this.id.replace("data-checkbox-", ""));
        const checked = this.checked;
        if (id <= -1) {
          $(".data-checkbox").prop("checked", checked);
        }

        let allOn = true;
        let allOff = true;
        $(".data-checkbox").each(function () {
          const id = parseInt(this.id.replace("data-checkbox-", ""));
          if (id > 0 && this.checked) allOff = false;
          if (id > 0 && !this.checked) allOn = false;
        });

        if (allOn) $(".data-checkbox").prop("checked", true);
        else $("#data-left-btn").addClass("invisible");

        if (allOff) $(".data-checkbox").prop("checked", false);
        else $("#data-left-btn").removeClass("invisible");
      });
    },
    error: function () {
      $(".refresh-btn")[0].classList.remove("loading");
      $(".refresh-btn")[0].innerHTML = "⭯ 刷新";
      $("#confirm-connect-error").trigger("click");
    },
  });
}
$(document).on("click", ".generate-label-btn", function () {
  const id = parseInt(
    $(this).parent().parent().parent().attr("data").split(";")[0]
  );
  $.ajax({
    url: `${backendServer}/generate/label_data/${id}`,
    dataType: "json",
    success: function (data) {
      alert(
        "正在生成标签，请稍等",
        "success",
        "<i class='fi fi-rr-time-past'></i>"
      );
    },
    error: function (data) {
      alert(
        "正在生成标签，请稍等",
        "success",
        "<i class='fi fi-rr-time-past'></i>"
      );
    },
  });
});
$(document).on("click", ".download-data-btn", function () {
  const id = parseInt(
    $(this).parent().parent().parent().attr("data").split(";")[0]
  );
  window.open(`${backendServer}/download/medical_data/${id}.nii.gz`);
});
$(".refresh-btn").on("click", function () {
  reload();
});
function disableUploadDataFiles() {
  $("#upload-data-btn")[0].classList.add("btn-disabled");
  $("#upload-data-btn")[0].parentElement.classList.add("cursor-not-allowed");
  $("#clear-upload-data-btn")[0].classList.add("btn-disabled");
  $("#clear-upload-data-btn")[0].parentElement.classList.add(
    "cursor-not-allowed"
  );
}
function enableUploadDataFiles() {
  $("#upload-data-btn")[0].classList.remove("btn-disabled");
  $("#upload-data-btn")[0].parentElement.classList.remove("cursor-not-allowed");
  $("#clear-upload-data-btn")[0].classList.remove("btn-disabled");
  $("#clear-upload-data-btn")[0].parentElement.classList.remove(
    "cursor-not-allowed"
  );
}

$("#upload-data-input").on("change", function () {
  selectedFiles = Array.from(this.files);
  const selectedFilesContainer = $("#upload-data-table")[0];
  let j = selectedFilesContainer.childElementCount;

  for (const file of selectedFiles) {
    const fileName = file.name.split(".")[0];
    const fileType = file.name.split(".").slice(1).toString().replace(",", ".");
    const fileSize = (file.size / (1024 * 1024)).toFixed(2);
    const fileContainer = document.createElement("tr");
    fileContainer.setAttribute("id", "upload-data-container-" + j);
    const fileInfo = `<th>
    <progress id="progress-data-files-${j}" class="transition-all progress-data-files progress w-8" value="0" max="100">
    </progress> </th><th><p type="text" class="whitespace-nowrap overflow-hidden block w-32 flex-nowrap text-ellipsis">${fileName} </p></th> <th>${parseInt(fileSize)} MB</th> <th>${fileType}</th><th><button class="btn btn-error btn-outline btn-xs upload-data-files-remove" id="upload-data-files-remove-${j}">删除</button></th>`;
    fileContainer.innerHTML = fileInfo;
    selectedFilesContainer.append(fileContainer);
    j++;
  }
  $(".upload-data-files-remove").on("click", function () {
    const index = this.id.split("-").slice(-1);
    $("#upload-data-container-" + index).remove();
    if ($("#upload-data-table")[0].childElementCount == 0) {
      disableUploadDataFiles();
    }
  });
  if (j != 0) {
    enableUploadDataFiles();
  }
});

$("#clear-upload-data-btn").on("click", function () {
  $(".upload-data-files-remove").each(function () {
    const index = this.id.split("-").slice(-1);
    $("#upload-data-container-" + index).remove();
  });
  disableUploadDataFiles();
});
$("#upload-data-btn").on("click", function () {
  disableUploadDataFiles();
  $("#upload-data-btn")[0].classList.add("loading");
  $("#upload-data-btn")[0].innerHTML = "上传中...";
  let index = 0;
  console.log(selectedFiles);
  for (const file of selectedFiles) {
    console.log(file);
    let i = index;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("infer", $("#data-infer-checkbox").prop("checked"));
    console.log(formData, index);
    $.ajax({
      xhr: function () {
        let i = index;

        let xhr = new window.XMLHttpRequest();
        xhr.upload.addEventListener(
          "progress",
          function (evt) {
            if (evt.lengthComputable) {
              const percentComplete = (evt.loaded / evt.total) * 100; // 计算进度条
              $(`#progress-data-files-${i}`)[0].value = percentComplete;
            }
          },
          false
        );

        return xhr;
      },
      type: "POST",
      url: `${backendServer}/upload/medical_data`,
      data: formData,
      processData: false,
      contentType: false,
      success: function () {
        $(`#progress-data-files-${i}`)[0].classList.add("progress-primary");
        let isFinished = true;
        $(".progress-data-files").each(function () {
          if (!$(this)[0].classList.contains("progress-primary")) {
            isFinished = false;
          }
        });
        console.log(isFinished);
        if (isFinished) {
          $("#upload-data-btn")[0].classList.remove("loading");
          alert("上传成功", "success");
          $("#upload-data-btn")[0].innerHTML = "开始上传";
          enableUploadDataFiles();
        }
      },
      error: function (ap) {
        $(`#progress-data-files-${i}`)[0].classList.add("progress-danger");
        $("#upload-data-btn")[0].classList.remove("loading");
        $("#upload-data-btn")[0].innerHTML = "开始上传";
        enableUploadDataFiles();
        if (ap.responseText !== undefined) {
          alert(
            ap.responseText,
            "warning",
            `<i class="fi fi-rr-exclamation" aria-hidden="true"></i>`
          );
        } else {
          alert(
            "未知错误",
            "error",
            `<i class="fi fi-rr-exclamation" aria-hidden="true"></i>`
          );
        }
      },
    });
    index++;
  }
  return false;
});
setInterval(function () {
  $.get(
    `${backendServer}/get/task`,
    function (data) {
      $("#task-table").empty();
      let index = 1
      if (JSON.stringify(data) == JSON.stringify(lastTask)) {
        return
      }
      newTask = true
      lastTask = data
      data.forEach((i) => {
        $(`<tr class="hover">
      <th>
      ${index++}
      </th>
      
      <td>
      ${i[0]}
      </td>
      <td>
      ${i[1]}
      </td>
      <td>
      <progress class="transition-all progress ${i[2] == 1 ? 'progress-primary' : ''}" value="${i[2] * 100}" max="100"></progress>
      </td>
    </tr>
`).appendTo("#task-table");
      });
    },
    null,
    "json"
  );
}, 400);
$("body").on("click", ".upload-label-btn", function () {
  let id = $(this).closest("tr").attr("data").split(";")[0];
  $("#upload-label-input").attr("data-id", id);

  $("#upload-label-input").trigger("click");
});

$("#upload-label-input").on("change", function () {
  file = Array.from(this.files);
  let id = $("#upload-label-input").attr("data-id");

  const formData = new FormData();
  formData.append("file", file[0]);
  formData.append("id", id);
  console.log(formData, id);
  $.ajax({
    type: "POST",
    url: `${backendServer}/upload/label_data`,
    data: formData,
    processData: false,
    contentType: false,
    success: function () {
      if (isFinished) {
        alert("上传成功", "success");
      }
      reload();
    },
  });
});

$("#confirm-delete-btn").on("click", function () {
  $(".data-checkbox").each(function () {
    const id = parseInt(this.id.replace("data-checkbox-", ""));
    console.log(id);
    if (this.checked && id > 0) {
      let id = $(this).closest("tr").attr("data").split(";")[0];
      $.ajax({
        url: `${backendServer}/delete/${id}`,
        success: function () {
          reload();
        },
        error: function (data) {
          if (ap.responseText !== undefined) {
            alert(
              data.responseText,
              "warning",
              `<i class="fi fi-rr-exclamation" aria-hidden="true"></i>`
            );
          } else {
            alert(
              "未知错误",
              "error",
              `<i class="fi fi-rr-exclamation" aria-hidden="true"></i>`
            );
          }
        },
      });
    }
  });
  reload();
});
function printElement(e) {
  let cloned = e.cloneNode(true);
  document.body.appendChild(cloned);
  cloned.classList.add("printable");
  setTimeout(function () {
    window.print();
    document.body.removeChild(cloned);
  }, 1200);
}
$("#btn-print-record").on("click", function () {
  printElement($(this).closest(".card").get()[0]);
});

$("#btn-added-patient").on("click", function () {
  $.ajax({
    url: `${backendServer}/scan/patient`,
    type: "GET",
    success: function (data) {
      console.log(data);
      let patient_name = data["result"][0];
      let gender = data["result"][1];
      let age = data["result"][2];
      let weight = data["result"][3];
      let phone = data["result"][4];
      let parent_phone = data["result"][5];
      let patient_id = data["result"][6];
      $("#woman-face").removeClass("hidden");
      $("#man-face").addClass("hidden");
      if (gender == "男") {
        $("#woman-face").addClass("hidden");
        $("#man-face").removeClass("hidden");
      }

      $("#patient-name").val(patient_name);
      $("#patient-gender").val(gender);
      $("#patient-age").val(age);
      $("#patient-weight").val(weight);
      $("#patient-phone").val(phone);
      $("#patient-parent-phone").val(parent_phone);
      $("#patient-id").val(patient_id);
    },
  });
});

$("#btn-add-patient").on("click", function () {
  $("#patient-name").val("");
  $("#patient-gender").val("");
  $("#patient-age").val("");
  $("#patient-weight").val("");
  $("#patient-phone").val("");
  $("#patient-parent-phone").val("");
  $("#patient-id").val("");

  $("#windows-patient-info").removeClass("hidden");
  $("#view-disease-record-history").addClass("hidden");
  addpatient.showModal();
});

$(document).on("mousemove", function (e) {
  // 如果鼠标移动到左边，展开抽屉
  if (e.clientX < 10 || $(e.target).parents(".drawer-side")[0] != undefined) {
    $("#drawer").prop("checked", true);
  } else {
    $("#drawer").prop("checked", false);
  }
  // 如果鼠标移动到右下角
  const width = window.innerWidth;
  const height = window.innerHeight;
  if ($(e.target).parents("#btn-task")[0] != undefined) {
    return;
  }
  if (e.clientX > width - 100 && e.clientY > height - 200 || newTask) {
    $("#btn-task").css("right", "20px");
  } else {
    $("#btn-task").css("right", "-200px");
    $("#taskList").addClass("hidden");
  }
});
$("#btn-task").on("click", function () {
  newTask = false;
  $("#taskList").removeClass("hidden");
});

var $mockupWindows = $(".mockup-window-title");

// 为每个元素添加拖动功能
$mockupWindows.each(function () {
  var $this = $(this);
  var isDragging = false;
  var lastX, lastY;
  var isResize = false;
  var xResize = false;
  var leftResize = false;

  // 当鼠标按下时，记录当前位置
  $this.mousedown(function (e) {
    if (e.which == 1) {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });

  // 当鼠标移动时，如果正在拖动，则计算并设置元素的新位置
  $(document).mousemove(function (e) {
    if (isDragging) {
      var deltaX = e.clientX - lastX;
      var deltaY = e.clientY - lastY;
      var newX = parseInt($this.parent().css("left")) + deltaX;
      var newY = parseInt($this.parent().css("top")) + deltaY;
      $this.parent().css({
        left: newX + "px",
        top: newY + "px",
      });
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });

  // 当鼠标松开时，停止拖动
  $(document).mouseup(function (event) {
    // 关闭所有的下拉框
    $("details").prop("open", false);
    isDragging = false;
    isResize = false;
  });

  $this.parent().on("mousemove", function (e) {
    if (isDragging) {
      $this.parent().css("cursor", "move");
      return;
    }
    var $window = $(this);
    var offset = $window.offset();
    var x = e.pageX - offset.left;
    var y = e.pageY - offset.top;
    var w = $window.outerWidth();
    var h = $window.outerHeight();

    // 在窗口的边缘时，改变鼠标指针样式
    if (x < 10 || x > w - 10) {
      $window.css("cursor", "w-resize");
    } else if (y > h - 10) {
      $window.css("cursor", "s-resize");
    } else {
      $window.css("cursor", "auto");
    }
  });

  // 添加缩小窗口大小的事件
  $this.parent().on("mousedown", function (e) {
    var $window = $(this);
    var offset = $window.offset();
    var x = e.pageX - offset.left;
    var y = e.pageY - offset.top;
    var w = $window.outerWidth();
    var h = $window.outerHeight();

    if (x < 10 || y < 10 || x > w - 10 || y > h - 10) {
      isResize = true;
      lastX = e.clientX;
      lastY = e.clientY;
      xResize = false;
      leftResize = false;
    }
    if (x < 10 || x > w - 10) {
      xResize = true;
    }
    if (x < 10) {
      leftResize = true;
    }
  });

  // 当鼠标移动时，如果正在缩小窗口，则计算并设置窗口的新大小
  $(document).mousemove(function (e) {
    if (isResize) {
      resizeCanvas();
      var deltaX = e.clientX - lastX;
      var deltaY = e.clientY - lastY;
      if (xResize) {
        var newWidth = parseInt($this.parent().css("width")) + deltaX;
      }

      var newX = parseInt($this.parent().css("left"));
      if (leftResize) {
        newWidth = parseInt($this.parent().css("width")) - deltaX;
        newX = parseInt($this.parent().css("left")) + deltaX;
      }
      if (!xResize) {
        var newHeight = parseInt($this.parent().css("height")) + deltaY;
      }

      $this.parent().css({
        width: newWidth + "px",
        height: newHeight + "px",
        left: newX + "px",
      });
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });
});

$("#btn-save-patient").on("click", function () {
  const formData = new FormData();
  formData.append("name", $("#patient-name").val());
  formData.append("gender", $("#patient-gender").val());
  formData.append("age", $("#patient-age").val());
  formData.append("weight", $("#patient-weight").val());
  formData.append("phone", $("#patient-phone").val());
  formData.append("parent_phone", $("#patient-parent-phone").val());
  formData.append("id", $("#patient-id").val());
  $.ajax({
    type: "POST",
    url: `${backendServer}/add/patient`,
    data: formData,
    processData: false,
    contentType: false,
    success: function () {
      alert("上传成功", "success");
      $("#windows-patient-info").addClass("hidden");
      reloadPatients();
    },
  });
});
$(".mockup-window-close").on("click", function () {
  $(this).closest(".mockup-windows").toggleClass("hidden");
});
let temp = {};
$(".mockup-window-max").on("click", function () {
  nv.opts.multiplanarForceRender = true;

  if (Object.keys(temp).length !== 0) {
    $(this).closest(".mockup-windows").css(temp);
    temp = {};
    resizeCanvas();

    nv.resizeListener();

    return;
  }

  temp = $(this)
    .closest(".mockup-windows")
    .css(["width", "height", "left", "top"]);

  $(this).closest(".mockup-windows").css({
    width: "100vw",
    height: "100vh",
    left: "0px",
    top: "0px",
  });
  resizeCanvas();

  nv.resizeListener();
});

function reloadPatients() {
  $.get(
    `${backendServer}/get/patients?${filterPatient}&order_by=${OrderBy}`,
    function (data) {
      console.log(data);
      $("#patient-table").empty();
      patients = data;
      data.forEach((i) => {
        console.log(i);
        $(`<tr>
      <th>${i[0]}</th>
      <td>${i[1]}</td>
      <td>${i[3]}</td>
      <td>${i[2]}</td>
      <td>${i[8]}</td>
      <td>${i[5]}</td>
      <td>
        <button class="btn-view-patient btn-info btn btn-sm">详情</button>
        <button class="btn-delete-patient btn-error btn-outline btn btn-sm">删除</button>
      </td>
    </tr>
`).appendTo("#patient-table");
      });
    },
    null,
    "json"
  );
}
reloadPatients();

$(".refresh-patient-btn").on("click", function () {
  reloadPatients();
});
$("#patient-table").on("click", ".btn-delete-patient", function () {
  let patient = patients[$(this).closest("tr").index()];
  console.log(patient);
  $.get(`${backendServer}/delete/patient`, { id: patient[7] }, function (data) {
    alert("删除成功", "success");
    reloadPatients();
  });
});
$("#patient-table").on("click", ".btn-view-patient", function () {
  $("#windows-patient-info").removeClass("hidden");
  let patient = patients[$(this).closest("tr").index()];
  console.log(patient);
  let patient_name = patient[1];
  let gender = patient[2];
  let age = patient[3];
  let weight = patient[4];
  let phone = patient[5];
  let parent_phone = patient[6];
  let patient_id = patient[7];
  $("#woman-face").removeClass("hidden");
  $("#man-face").addClass("hidden");
  $("#view-disease-record-history").removeClass("hidden");
  $("#view-disease-record").addClass("hidden")
  if (gender == "男") {
    $("#woman-face").addClass("hidden");
    $("#man-face").removeClass("hidden");
  }

  $("#patient-name").val(patient_name);
  $("#patient-gender").val(gender);
  $("#patient-age").val(age);
  $("#patient-weight").val(weight);
  $("#patient-phone").val(phone);
  $("#patient-parent-phone").val(parent_phone);
  $("#patient-id").val(patient_id);
  reloadPatientRecord(patient_id);
});
function reloadPatientRecord(patient_id) {
  records = [];
  $.get(`${backendServer}/get/disease_record/${patient_id}`, function (data) {
    $("#table-disease-record").empty();
    console.log(data);
    records = data;
    data.forEach((i) => {
      console.log(i);
      $(`<tr>
    <th>${i[0]}</th>
    <td>${i[3]}</td>
    <td>${i[4]}</td>
    <td>${i[5]}</td>
    <td>${i[6]}</td>
    <td>${i[7] == "true" ? "是" : "否"}</td>
    <td>${i[8] == "true" ? "是" : "否"}</td>
      <td><div class="btn-xs btn btn-success btn-edit-record">编辑</div><div class="btn-xs btn btn-error btn-delete-record">删除</div></td>
    </tr>
    `).appendTo("#table-disease-record");
    });
  });
}
$(document).on("click", ".btn-edit-record", function () {
  newRecord = false;
  clearRecord()
  let record = records[$(this).closest("tr").index()];
  console.log(record);
  $("#view-disease-record").removeClass("hidden");
  $("#MZdocter").val(record[2]);
  $("#docter").val(record[3]);
  $("#nurse").val(record[4]);
  $("#symptom").val(record[5]);
  $("#diagnosis").val(record[6]);
  $("#needImage").get(0).checked = record[7] == "true" ? true : false;
  if (record[7] == "true") {
    $("#ct-image").removeClass("hidden");
  }
  $("#inHospital").get(0).checked = record[8];
  $("#btn-save-record").attr("data-id", record[0]);
  $.get({
    url: `${backendServer}/get/ct_image/${record[0]}?new=false`,
    success: function(data){
      if (data.search(";") != -1){
        return;
      }
      $("#ct-image").html(`<img class="m-auto w-36 h-36" src="${backendServer}/download/thumbnail/${data}.png" /><button data="${data}" class="btn-xs btn-block record-preview-image btn btn-info">查看图像</button>`)
    } 
  })
});
$(document).on("click", ".btn-delete-record", function () {
  let record = records[$(this).closest("tr").index()];
  console.log(record);
  $.get(
    `${backendServer}/delete/disease_record`,
    { id: record[0] },
    function (data) {
      alert("删除成功", "success");
      reloadPatientRecord($("#patient-id").val());
    }
  );
});

$("#btn-add-disease-record").on("click", function () {
  clearRecord();
  newRecord = true;
  $("#btn-save-record").attr("data-id", null);
  $("#view-disease-record").removeClass("hidden");
});
function clearRecord() {
  $("#ct-image").html(`
  <button id="btn-image" class="block btn btn-success">
  拍片  
</button>`)
  $("#ct-image").addClass("hidden")
  $("#MZdocter").val("");
  $("#docter").val("");
  $("#nurse").val("");
  $("#symptom").val("");
  $("#diagnosis").val("");
  $("#needImage").get(0).checked = false;
  $("#inHospital").get(0).checked = false;
}
$("#btn-save-record").on("click", function () {
  const formData = new FormData();
  formData.append("patient_id", $("#patient-id").val());
  formData.append("MZdocter", $("#MZdocter").val());
  formData.append("docter", $("#docter").val());
  formData.append("nurse", $("#nurse").val());
  formData.append("inHospital", $("#inHospital").get(0).checked);
  formData.append("symptom", $("#symptom").val());
  formData.append("diagnosis", $("#diagnosis").val());
  formData.append("needImage", $("#needImage").get(0).checked);
  if ($(this).attr("data-id") != null) {
    formData.append("id", $(this).attr("data-id"));
    $.ajax({
      type: "POST",
      url: `${backendServer}/update/disease_record`,
      data: formData,
      processData: false,
      contentType: false,
      success: function () {
        alert("更新成功", "success");
        reloadPatientRecord($("#patient-id").val());
        $("#view-disease-record").addClass("hidden");
      },
    });
  } else {
    $.ajax({
      type: "POST",
      url: `${backendServer}/add/disease_record`,
      data: formData,
      processData: false,
      contentType: false,
      success: function () {
        alert("上传成功", "success");
        reloadPatientRecord($("#patient-id").val());
        $("#view-disease-record").addClass("hidden");
      },
    });
  }
});

$("#btn-grow-cut").on("click", function () {
});
$("#tab-draw").on("click", "a", function () {
  let mode = $(this).attr("value");
  if (mode == null) {
    return;
  }
  mode = parseInt(mode);
  $(this)
    .closest("#tab-draw")
    .find("a")
    .each(function () {
      let mode = $(this).attr("value");
      if (mode == null) {
        return;
      }
      $(this).html(
        $(this).html().replace('<i class="fi fi-br-check"></i>', "")
      );
    });
  $(this).html($(this).html() + "<i class='fi fi-br-check'></i>");
  switch (mode) {
    case -1:
      nv.setDrawingEnabled(false);
      break;
    default:
      nv.setPenValue(mode, $("#checkbox-draw-fill").prop("checked"));
      nv.setDrawingEnabled(true);
      break;
  }
});

$("#showCt").on("click", function () {
  let check = $(this).prop("checked");
  nv.volumes[0].opacity = check;
  nv.updateGLVolume();
})
$("#showLabel").on("click", function () {
  let check = $(this).prop("checked");
  nv.setDrawOpacity(check)
  nv.updateGLVolume();
})
$("#tab-right-click").on("click", "a", function () {
  let mode = $(this).attr("value");
  if (mode == null) {
    return;
  }
  mode = parseInt(mode);
  $(this)
    .closest("#tab-right-click")
    .find("a")
    .each(function () {
      let mode = $(this).attr("value");
      if (mode == null) {
        return;
      }
      $(this).html(
        $(this).html().replace('<i class="fi fi-br-check"></i>', "")
      );
    });
  $(this).html($(this).html() + "<i class='fi fi-br-check'></i>");
  switch (mode) {
    case 0:
      nv.opts.dragMode = nv.dragModes.contrast;
      break;
    case 1:
      nv.opts.dragMode = nv.dragModes.pan;

      break;
    case 2:
      nv.opts.dragMode = nv.dragModes.measurement;
      break;
    case 3:
      nv.opts.dragMode = nv.dragModes.none;
      break;
  }
});
$("#tab-view").on("click", "a", function () {
  let mode = $(this).attr("value");
  if (mode == null) {
    return;
  }
  mode = parseInt(mode);
  if (mode != 0){
    $(this)
      .closest("#tab-view")
      .find("a")
      .each(function () {
        let mode = $(this).attr("value");
        if (mode == null || mode == 0) {
          return;
        }
        $(this).html(
          $(this).html().replace('<i class="fi fi-br-check"></i>', "")
        );
      });
  }
  $(this).html($(this).html() + "<i class='fi fi-br-check'></i>");
  switch (mode) {
    case 0:
      if (nv.isAlphaClipDark) {
        $(this).html(
          $(this).html().replaceAll('<i class="fi fi-br-check"></i>', "")
        );
      }
      nv.isAlphaClipDark = nv.isAlphaClipDark ? false : true;
      nv.updateGLVolume();
      break;
    case 1:
      nv.setSliceType(nv.sliceTypeMultiplanar);
      nv.opts.multiplanarForceRender = true;
      nv.resizeListener();

      break;
    case 2:
      nv.setSliceType(nv.sliceTypeMultiplanar);
      nv.opts.multiplanarForceRender = false;
      nv.resizeListener();

      break;
    case 3:
      nv.setSliceType(nv.sliceTypeAxial);
      break;
    case 4:
      nv.setSliceType(nv.sliceTypeCoronal);
      break;
    case 5:
      nv.setSliceType(nv.sliceTypeSagittal);
      break;
    case 6:
      nv.setSliceType(nv.sliceTypeRender);
      break;
  }
});
$("#checkbox-draw-fill")
  .on("click", function () {
    if ($(this).prop("checked")) {
      $(this).html(
        $(this).html().replace('<i class="fi fi-br-check"></i>', "")
      );
      nv.setPenValue(nv.opts.penValue, false);
      $(this).prop("checked", false);
    } else {
      $(this).html($(this).html() + "<i class='fi fi-br-check'></i>");
      nv.setPenValue(nv.opts.penValue, true);
      $(this).prop("checked", true);
    }
  })
  .prop("checked", true);

$("#range-draw-alpha").on("mousemove", function () {
  nv.setDrawOpacity($(this).val() / 100);
});

$("#btn-undo").on("click", function () {
  nv.drawUndo();
});
$("#search-patient-name").on("submit", function (e) {
  e.preventDefault();
  filterPatient = filterPatient.replace(/&name=.*&/g, "&");
  filterPatient = filterPatient.replace(/&name=.*/g, "");
  filterPatient += "&name=" + $("#input-search-patient-name").val();
  reloadPatients();
});

$(".filter-enable").on("click", function (e) {
  if (
    $(this).siblings(".active-filter").css("right") == "14.4px" ||
    $(this).siblings(".active-filter").css("right") == "16px"
  ) {
    e.preventDefault();
  }
  $(this).siblings(".active-filter").css("right", "2.3rem");
});
$(".filter-disable").on("click", function () {
  $(this).siblings(".active-filter").css("right", "0.9rem");
});
$("#order-patient-age").on("change", function () {
  let desc = $(this).get(0).checked;
  OrderBy = OrderBy.replace(/Age (DESC|ASC),/g, "");
  OrderBy += `Age ${desc ? "DESC" : "ASC"},`;
  reloadPatients();
});
$("#order-edit-time").on("change", function () {
  let desc = $(this).get(0).checked;
  OrderBy = OrderBy.replace(/EditTime (DESC|ASC),/g, "");
  OrderBy += `EditTime ${desc ? "DESC" : "ASC"},`;
  reloadPatients();
});

$("#btn-download-label").on("click", function () {
  nv.saveImage("download.nii", true);
});
$("#btn-goto-patient").on("click", function () {
  gotoTab("patient");
});

$("#btn-goto-data").on("click", function () {
  gotoTab("data");
});

$("#btn-goto-home").on("click", function () {
  gotoTab("root");
});
const fakeData = {
  // 门诊接入科室比例数据
  pieData: [
    { name: "内科", value: 40 },
    { name: "外科", value: 20 },
    { name: "儿科", value: 15 },
    { name: "妇产科", value: 10 },
    { name: "其他", value: 15 },
  ],
  // 上个月到这个月的门诊人数变化数据
  lineData: {
    xAxisData: ["6-1", "6-8", "6-15", "6-22", "6-29", "7-6"],
    seriesData: [120, 132, 101, 134, 90, 230],
  },
  // 诊断病症数据
  barData: [
    { name: "感冒", lastWeek: 50, thisWeek: 60 },
    { name: "高血压", lastWeek: 40, thisWeek: 45 },
    { name: "糖尿病", lastWeek: 30, thisWeek: 35 },
  ],
  // 拍片人数上周到这周的人数变化数据
  filmLineData: {
    xAxisData: ["6-1", "6-8", "6-15", "6-22", "6-29", "7-6"],
    seriesData: [80, 110, 95, 125, 100, 150],
  },
  // 需要拍片的病症
  filmBarData: [
    { name: "肺炎", lastWeek: 30, thisWeek: 35 },
    { name: "骨折", lastWeek: 25, thisWeek: 28 },
    { name: "肠胃炎", lastWeek: 20, thisWeek: 22 },
  ],
};

const pieChart = echarts.init(document.getElementById("pie-chart"));
const lineChart = echarts.init(document.getElementById("line-chart"));
const barChart = echarts.init(document.getElementById("bar-chart"));
const filmLineChart = echarts.init(document.getElementById("film-line-chart"));
const filmBarChart = echarts.init(document.getElementById("film-bar-chart"));

// 配置图表
pieChart.setOption({
  series: [
    {
      type: "pie",
      data: fakeData.pieData,
    },
  ],
});

lineChart.setOption({
  xAxis: {
    type: "category",
    data: fakeData.lineData.xAxisData,
  },
  yAxis: {
    type: "value",
  },
  series: [
    {
      data: fakeData.lineData.seriesData,
      type: "line",
    },
  ],
});

barChart.setOption({
  xAxis: {
    type: "category",
    data: fakeData.barData.map((item) => item.name),
  },
  yAxis: {
    type: "value",
  },
  series: [
    {
      name: "上周",
      data: fakeData.barData.map((item) => item.lastWeek),
      type: "bar",
    },
    {
      name: "本周",
      data: fakeData.barData.map((item) => item.thisWeek),
      type: "bar",
    },
  ],
});

filmLineChart.setOption({
  xAxis: {
    type: "category",
    data: fakeData.filmLineData.xAxisData,
  },
  yAxis: {
    type: "value",
  },
  series: [
    {
      data: fakeData.filmLineData.seriesData,
      type: "line",
    },
  ],
});

filmBarChart.setOption({
  xAxis: {
    type: "category",
    data: fakeData.filmBarData.map((item) => item.name),
  },
  yAxis: {
    type: "value",
  },
  series: [
    {
      name: "上周",
      data: fakeData.filmBarData.map((item) => item.lastWeek),
      type: "bar",
    },
    {
      name: "本周",
      data: fakeData.filmBarData.map((item) => item.thisWeek),
      type: "bar",
    },
  ],
});
const chart = echarts.init(document.getElementById('wordcloud'))


chart.setOption({
    series: [{
        type: 'wordCloud',
        keepAspect: false,
        maskImage: document.getElementById('mask'),
        left: 'center',
        top: 'center',
        width: '70%',
        height: '80%',
        right: null,
        bottom: null,
        sizeRange: [9, 60],
        rotationRange: [-90, 90],
        rotationStep: 45,
        gridSize: 1,
        drawOutOfBound: false,
        layoutAnimation: true,
        textStyle: {
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            color: function () {
                return 'rgb(' + [
                    0,
                    Math.round(Math.random() * 160),
                    Math.round(Math.random() * 160)
                ].join(',') + ')';
            }
        },
        emphasis: {
            focus: 'self',
            textStyle: {
                textShadowBlur: 10,
                textShadowColor: '#333'
            }
        },
        data: [
          {'name': '高血压', 'value': 27.9},
          {'name': '糖尿病', 'value': 10.9},
          {'name': '冠心病', 'value': 8.6},
          {'name': '脑卒中', 'value': 7.4},
          {'name': '慢性阻塞性肺病', 'value': 6.8},
          {'name': '肺癌', 'value': 4.9},
          {'name': '胃癌', 'value': 4.1},
          {'name': '肝癌', 'value': 3.8},
          {'name': '乳腺癌', 'value': 3.5},
          {'name': '结直肠癌', 'value': 3.3},
          {'name': '慢性肾脏病', 'value': 3.0},
          {'name': '骨折', 'value': 2.8},
          {'name': '食管癌', 'value': 2.5},
          {'name': '抑郁症', 'value': 2.3},
          {'name': '宫颈癌', 'value': 2.1},
          {'name': '精神分裂症', 'value': 1.9},
          {'name': '白血病', 'value': 1.8},
          {'name': '前列腺癌', 'value': 1.7},
          {'name': '慢性肝炎', 'value': 1.6},
          {'name': '胰腺癌', 'value': 1.5},
          {'name': '痛风', 'value': 1.4},
          {'name': '甲状腺癌', 'value': 1.3},
          {'name': '鼻咽癌', 'value': 1.2},
          {'name': '风湿性关节炎', 'value': 1.2},
          {'name': '结核病', 'value': 1.1},
          {'name': '口腔癌', 'value': 1.0},
          {'name': '卵巢癌', 'value': 0.9},
          {'name': '子宫肌瘤', 'value': 0.9},
          {'name': '癫痫', 'value': 0.8},
          {'name': '慢性胰腺炎', 'value': 0.8},
          {'name': '类风湿性关节炎', 'value': 0.7},
          {'name': '骨质疏松', 'value': 0.7},
          {'name': '多发性硬化', 'value': 0.6},
          {'name': '原发性肺动脉高压', 'value': 0.6},
          {'name': '胃溃疡', 'value': 0.5},
          {'name': '十二指肠溃疡', 'value': 0.5},
          {'name': '帕金森病', 'value': 0.5},
          {'name': '老年痴呆', 'value': 0.4},
          {'name': '强直性脊柱炎', 'value': 0.4},
          {'name': '系统性红斑狼疮', 'value': 0.4},
          {'name': '丙型肝炎', 'value': 0.3},
          {'name': '肺结核', 'value': 0.3},
          {'name': '神经性厌食', 'value': 0.3},
          {'name': '多囊卵巢综合征', 'value': 0.3},
          {'name': '溃疡性结肠炎', 'value': 0.2},
          {'name': '克罗恩病', 'value': 0.2},
          {'name': '肌萎缩侧索硬化', 'value': 0.2},
          {'name': '特发性血小板减少性紫癜', 'value': 0.2},
          {'name': '胆囊癌', 'value': 0.2},
          {'name': '甲状腺功能亢进', 'value': 0.2},
          {'name': '甲状腺功能减退', 'value': 0.1},
          {'name': '布氏杆菌病', 'value': 0.1},
          {'name': '尖锐湿疣', 'value': 0.1},
          {'name': '肾结石', 'value': 0.1},
          {'name': '胆结石', 'value': 0.1},
          {'name': '红斑狼疮性肾炎', 'value': 0.1},
          {'name': '肠道寄生虫病', 'value': 0.1},
          {'name': '梅毒', 'value': 0.1},
          {'name': '淋病', 'value': 0.1},
          {'name': '病毒性肝炎', 'value': 0.1},
          {'name': '感冒', 'value': 0.3},
          {'name': '高血压', 'value': 0.9},
          {'name': '糖尿病', 'value': 0.9},
          {'name': '心脏病', 'value': 0.8},
          {'name': '癌症', 'value': 0.0},
          {'name': '脑卒中', 'value': 0.6},
          {'name': '肺炎', 'value': 0.4},
          {'name': '腹泻', 'value': 0.2},
          {'name': '哮喘', 'value': 0.1},
          {'name': '肺结核', 'value': 0.9},
          {'name': '肝炎', 'value': 0.8},
          {'name': '关节炎', 'value': 0.7},
          {'name': '病毒性感染', 'value': 0.8},
          {'name': '肾病', 'value': 0.8},
          {'name': '乙肝', 'value': 0.8},
          {'name': '骨折', 'value': 0.8},
          {'name': '过敏性鼻炎', 'value': 0.8},
          {'name': '痛风', 'value': 0.8},
          {'name': '贫血', 'value': 0.8},
          {'name': '黄疸', 'value': 0.8},
          {'name': '痔疮', 'value': 0.8},
          {'name': '胆结石', 'value': 0.8},
          {'name': '肾结石', 'value': 0.8},
          {'name': '甲亢', 'value': 0.8},
          {'name': '带状疱疹', 'value': 0.8},
          {'name': '溃疡性结肠炎', 'value': 0.8},
          {'name': '食管炎', 'value': 0.8},
          {'name': '胃溃疡', 'value': 0.8},
          {'name': '胰腺炎', 'value': 0.8},
          {'name': '中耳炎', 'value': 0.8},
          {'name': '肾炎', 'value': 0.8},
          {'name': '脑炎', 'value': 0.8},
          {'name': '心肌炎', 'value': 0.8},
          {'name': '败血症', 'value': 0.8},
          {'name': '结膜炎', 'value': 0.8},
          {'name': '白内障', 'value': 0.8},
          {'name': '青光眼', 'value': 0.8},
          {'name': '视网膜脱落', 'value': 0.8},
          {'name': '口腔溃疡', 'value': 0.8},
          {'name': '牙周病', 'value': 0.8},
          {'name': '龋齿', 'value': 0.8},
          {'name': '皮肤病', 'value': 0.8},
          {'name': '痤疮', 'value': 0.8},
          {'name': '湿疹', 'value': 0.8},
          {'name': '牛皮癣', 'value': 0.8},
          {'name': '白癜风', 'value': 0.8},
          {'name': '荨麻疹', 'value': 0.8},
          {'name': '多囊卵巢综合症', 'value': 0.8},
          {'name': '子宫肌瘤', 'value': 0.8},
          {'name': '宫颈糜烂', 'value': 0.8},
          {'name': '阴道炎', 'value': 0.8},
          {'name': '盆腔炎', 'value': 0.8},
          {'name': '乳腺癌', 'value': 0.8},
          {'name': '前列腺炎', 'value': 0.8},
          {'name': '前列腺增生', 'value': 0.8},
          {'name': '睾丸炎', 'value': 0.8},
          {'name': '早泄', 'value': 0.8},
          {'name': '阳痿', 'value': 0.8},
          {'name': '包皮过长', 'value': 0.8},
          {'name': '不孕不育', 'value': 0.8},
          {'name': '宫外孕', 'value': 0.8},
          {'name': '流产', 'value': 0.8},
          {'name': '产后抑郁症', 'value': 0.8},
          {'name': '更年期综合症', 'value': 0.8},
          {'name': '抑郁症', 'value': 0.8},
          {'name': '焦虑症', 'value': 0.8},
          {'name': '强迫症', 'value': 0.8},
          {'name': '恐惧症', 'value': 0.8},
          {'name': '创伤后应激障碍', 'value': 0.8},
          {'name': '失眠症', 'value': 0.8},
          {'name': '多动症', 'value': 0.8},
          {'name': '自闭症', 'value': 0.8},
          {'name': '精神分裂症', 'value': 0.8},
          {'name': '躁郁症', 'value': 0.8},
          {'name': '帕金森病', 'value': 0.8},
          {'name': '阿尔茨海默病', 'value': 0.8},
          {'name': '肌萎缩侧索硬化', 'value': 0.8},
          {'name': '多发性硬化', 'value': 0.8},
          {'name': '肌张力障碍', 'value': 0.8},
          {'name': '癫痫', 'value': 0.8},
          {'name': '偏头痛', 'value': 0.8},
          {'name': '神经痛', 'value': 0.8},
          {'name': '面瘫', 'value': 0.8},
          {'name': '坐骨神经痛', 'value': 0.8},
          {'name': '带状神经痛', 'value': 0.8},
          {'name': '骨质疏松症', 'value': 0.8},
          {'name': '脊柱侧弯', 'value': 0.8},
          {'name': '颈椎病', 'value': 0.8},
          {'name': '腰椎病', 'value': 0.8},
          {'name': '坐骨神经痛', 'value': 0.8},
          {'name': '肩周炎', 'value': 0.8},
          {'name': '腱鞘炎', 'value': 0.8},
          {'name': '网球肘', 'value': 0.8}
        ]
      
    }]
});
$("#needImage").on("click", function(){
  let checked = this.checked
  if(checked && !newRecord){
    $("#ct-image").removeClass("hidden")
  }
  else{                         
    $("#ct-image").addClass("hidden")
  }
})

$(document).on("click", "#btn-image", function(){
  scanimage.showModal();
})

$("#btn-scan-image").on("click", function(){
  let recordId = $("#btn-save-record").attr("data-id");
  $.get({
    url: `${backendServer}/get/ct_image/${recordId}?new=true`,
    success: function(data){
      console.log(data)
      $("#ct-image").html(`<img class="m-auto w-36 h-36" src="${backendServer}/download/thumbnail/${data}.png" /><button data="${data}" class="btn-xs btn-block record-preview-image btn btn-info">查看图像</button>`)
    } 
  })
})
$(document).on("click", ".record-preview-image", function(){
  let data = $(this).attr("data")
  previewData(data);
})

$(document).on("click", ".link-search-patient", function(){
  let patient_name = $(this).html();
  gotoTab("patient")
  $("#input-search-patient-name").val(patient_name)
  $("#search-patient-name").trigger("submit")
})