const fs = require('fs');

const replacement = `      {/* ======================================================== */}
      {/* Modal: เพิ่ม / แก้ไขประเภทงาน (ส่วนที่ 2: งานรอง & ส่วนที่ 3: งานสนับสนุน) */}
      {/* เชื่อมโยงฐานข้อมูล Supabase เพื่อให้ลิงค์กับทุกวันที่บันทึก */}
      {/* ======================================================== */}
      {activityItemModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-2xl text-xs max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={\`p-2 rounded-xl text-white \${
                    activityItemModal.part === 'indirect' ? 'bg-blue-600' : 'bg-purple-600'
                  }\`}
                >
                  {activityItemModal.isNew ? <Plus className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>
                      {activityItemModal.isNew
                        ? \`เพิ่มประเภท\${activityItemModal.part === 'indirect' ? 'งานรอง (ส่วนที่ 2)' : 'งานสนับสนุน (ส่วนที่ 3)'}ใหม่\`
                        : \`แก้ไขประเภท\${activityItemModal.part === 'indirect' ? 'งานรอง' : 'งานสนับสนุน'}\`}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ฝ่ายงาน: <strong>{DEPARTMENT_LABELS[activeDept]?.name || activeDept}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivityItemModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                  ชื่อประเภทกิจกรรม / ชื่องาน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    activityItemModal.part === 'indirect'
                      ? 'เช่น บันทึกชาร์จผู้ป่วยหนัก, เตรียมยาผสมพิเศษ, ประสานงาน Refer'
                      : 'เช่น ตรวจเช็ครถกู้ชีพฉุกเฉินประจำวัน, ตรวจนับคลังสารน้ำ, IC Round'
                  }
                  value={activityItemModal.name}
                  onChange={(e) => setActivityItemModal({ ...activityItemModal, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    หมวดหมู่กิจกรรม
                  </label>
                  <select
                    value={activityItemModal.category}
                    onChange={(e) => setActivityItemModal({ ...activityItemModal, category: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-medium"
                  >
                    {activityItemModal.part === 'indirect' ? (
                      <>
                        <option value="documentation">เวชระเบียน / บันทึกชาร์จ</option>
                        <option value="medication">เตรียมยา / สารน้ำ</option>
                        <option value="coordination">ประสานงาน / ส่งต่อ</option>
                        <option value="handover">ส่งมอบเวรข้ามกะ</option>
                        <option value="custom">งานรองเฉพาะด้าน</option>
                      </>
                    ) : (
                      <>
                        <option value="ward_management">บริหารวอร์ด / ตรวจเวร</option>
                        <option value="equipment_check">ตรวจเครื่องมือ / รถช่วยชีวิต</option>
                        <option value="ic">ป้องกันการติดเชื้อ (IC)</option>
                        <option value="cqi_ha">พัฒนาคุณภาพ (CQI / HA)</option>
                        <option value="custom">งานสนับสนุนทั่วไป</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    ขอบเขตการใช้งาน
                  </label>
                  <select
                    value={activityItemModal.departmentScope}
                    onChange={(e) => setActivityItemModal({ ...activityItemModal, departmentScope: e.target.value as any })}
                    className="w-full px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="ALL">ใช้ได้ทุกฝ่ายงาน (ER, OPD, IPD1, IPD2, LR)</option>
                    <option value={activeDept}>เฉพาะฝ่าย {activeDept} นี้เท่านั้น</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    เวลามาตรฐานต่อหน่วย (นาที) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={activityItemModal.unitTimeMinutes}
                    onChange={(e) =>
                      setActivityItemModal({
                        ...activityItemModal,
                        unitTimeMinutes: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="w-full px-2.5 py-2 text-xs font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-blue-600 dark:text-blue-400"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                    หน่วยนับ
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ราย, ครั้ง, เคส, กะ"
                    value={activityItemModal.unitLabel}
                    onChange={(e) => setActivityItemModal({ ...activityItemModal, unitLabel: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                  />
                </div>

                {activityItemModal.part === 'support' && (
                  <>
                    <div>
                      <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                        รอบความถี่กิจกรรม
                      </label>
                      <select
                        value={activityItemModal.frequencyType}
                        onChange={(e) =>
                          setActivityItemModal({
                            ...activityItemModal,
                            frequencyType: e.target.value as any,
                          })
                        }
                        className="w-full px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="daily">รายวัน (Daily)</option>
                        <option value="weekly">รายสัปดาห์ (Weekly)</option>
                        <option value="monthly">รายเดือน (Monthly)</option>
                        <option value="custom">ตามรอบเฉพาะกิจ</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                        จำนวนครั้งมาตรฐานตามรอบ
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={activityItemModal.frequencyCount}
                        onChange={(e) =>
                          setActivityItemModal({
                            ...activityItemModal,
                            frequencyCount: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                        className="w-full px-2.5 py-2 text-xs font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  คำอธิบายเพิ่มเติม / ขอบเขตงาน
                </label>
                <input
                  type="text"
                  placeholder="เช่น ข้อควรระวัง ขั้นตอน หรือเกณฑ์เวลาที่ใช้อ้างอิง"
                  value={activityItemModal.note}
                  onChange={(e) => setActivityItemModal({ ...activityItemModal, note: e.target.value })}
                  className="w-full px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                />
              </div>

              {/* Database Link Checkbox */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 space-y-1.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activityItemModal.linkToDatabase}
                    onChange={(e) =>
                      setActivityItemModal({ ...activityItemModal, linkToDatabase: e.target.checked })
                    }
                    className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-xs text-blue-950 dark:text-blue-100 flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>บันทึกเป็นประเภทมาตรฐานส่วนกลาง (บันทึกฐานข้อมูลเพื่อลิงค์กับทุกวันที่บันทึก)</span>
                    </span>
                    <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 mt-0.5 leading-snug">
                      ประเภทงานนี้จะถูกบันทึกลงฐานข้อมูล Supabase และเพิ่มลงในทุกวันที่เคยบันทึกไว้ รวมถึงวันที่จะบันทึกใหม่ในอนาคต เพื่อให้ทุกเวรสามารถลงข้อมูลได้ทันที
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActivityItemModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveActivityModal}
                disabled={!activityItemModal.name.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>บันทึกลงฐานข้อมูลและเชื่อมโยงทุกวัน</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Modal: ยืนยันการลบประเภทงาน (Delete Confirmation Modal)    */}
      {/* ======================================================== */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">ยืนยันการลบประเภทกิจกรรม</h3>
                <p className="text-[11px] text-slate-400">
                  {deleteDialog.part === 'indirect' ? 'ส่วนที่ 2: งานรอง' : 'ส่วนที่ 3: งานสนับสนุน'}
                </p>
              </div>
            </div>

            <p className="text-slate-600 dark:text-slate-300 text-xs">
              คุณต้องการลบประเภทกิจกรรม <strong>"{deleteDialog.name}"</strong> ออกจากระบบในลักษณะใด?
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleConfirmDelete(false)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-left text-xs transition-all cursor-pointer"
              >
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  ลบเฉพาะวันที่บันทึกนี้ ({formData.date})
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  ยังคงมีประเภทงานนี้อยู่ในฐานข้อมูลกลางและวันที่อื่นๆ
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleConfirmDelete(true)}
                className="w-full p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100/60 dark:hover:bg-rose-900/40 text-left text-xs transition-all cursor-pointer"
              >
                <div className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-rose-600" />
                  <span>ลบออกจากฐานข้อมูลกลาง และทุกวันที่บันทึก (ลบถาวร)</span>
                </div>
                <div className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                  ลบประเภทนี้ออกจาก Supabase และถอดรายการออกจากทุกวันที่เคยบันทึกไว้ในระบบ
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeleteDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Modal: คลังประเภทงานส่วนกลาง (Master Activity Catalog Modal) */}
      {/* ======================================================== */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-2xl text-xs max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>คลังประเภทกิจกรรมงานรอง & งานสนับสนุน (Master Activity Catalog)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-semibold">
                      {activityTemplates.length} ประเภท
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    ประเภทงานที่จัดเก็บในฐานข้อมูล Supabase และเชื่อมโยงกับทุกวันที่บันทึก
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อกิจกรรม..."
                  value={catalogSearchTerm}
                  onChange={(e) => setCatalogSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <select
                  value={catalogPartFilter}
                  onChange={(e) => setCatalogPartFilter(e.target.value as any)}
                  className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-200"
                >
                  <option value="all">ส่วนงานทั้งหมด</option>
                  <option value="indirect">ส่วนที่ 2: งานรอง</option>
                  <option value="support">ส่วนที่ 3: งานสนับสนุน</option>
                </select>

                <select
                  value={catalogDeptFilter}
                  onChange={(e) => setCatalogDeptFilter(e.target.value as any)}
                  className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-200"
                >
                  <option value="all">ทุกฝ่ายงาน</option>
                  <option value="ALL">ใช้ได้ทุกฝ่าย (ALL)</option>
                  <option value="ER">เฉพาะ ER</option>
                  <option value="OPD">เฉพาะ OPD</option>
                  <option value="IPD1">เฉพาะ IPD1</option>
                  <option value="IPD2">เฉพาะ IPD2</option>
                  <option value="LR">เฉพาะ LR</option>
                </select>

                {onSyncAllDatesWithTemplates && (
                  <button
                    type="button"
                    onClick={async () => {
                      await onSyncAllDatesWithTemplates();
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer"
                    title="เชื่อมโยงประเภทงานทั้งหมดในฐานข้อมูลเข้ากับทุกวันที่บันทึก"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>เชื่อมโยงทุกวัน</span>
                  </button>
                )}
              </div>
            </div>

            {/* List Table */}
            <div className="overflow-y-auto flex-1 rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <tr className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <th className="py-2 px-3 w-10 text-center">#</th>
                    <th className="py-2 px-3">ประเภทกิจกรรม</th>
                    <th className="py-2 px-3 text-center w-28">ส่วนงาน</th>
                    <th className="py-2 px-3 text-center w-24">ฝ่ายงาน</th>
                    <th className="py-2 px-3 text-center w-28">เวลามาตรฐาน</th>
                    <th className="py-2 px-3 text-center w-24">ฐานข้อมูล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activityTemplates
                    .filter((t) => {
                      const matchSearch =
                        t.name.toLowerCase().includes(catalogSearchTerm.toLowerCase()) ||
                        (t.note && t.note.toLowerCase().includes(catalogSearchTerm.toLowerCase()));
                      const matchPart = catalogPartFilter === 'all' || t.workloadPart === catalogPartFilter;
                      const matchDept = catalogDeptFilter === 'all' || t.department === catalogDeptFilter || t.department === 'ALL';
                      return matchSearch && matchPart && matchDept;
                    })
                    .map((tpl, idx) => (
                      <tr key={tpl.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-center font-mono text-slate-400 text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-800 dark:text-slate-100">{tpl.name}</div>
                          {tpl.note && <div className="text-[11px] text-slate-400 mt-0.5">{tpl.note}</div>}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={\`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold \${
                              tpl.workloadPart === 'indirect'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            }\`}
                          >
                            {tpl.workloadPart === 'indirect' ? 'ส่วนที่ 2: งานรอง' : 'ส่วนที่ 3: งานสนับสนุน'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                            {tpl.department}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                          {tpl.unitTimeMinutes} นาที/{tpl.unitLabel || 'ครั้ง'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                            <Cloud className="w-3 h-3 text-emerald-600" />
                            <span>เชื่อมทุกวัน</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}`;

const filePath = '/app/applet/src/components/DataEntryForm.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetStart = "{/* Modal: เพิ่ม / แก้ไขประเภทงานรอง (Indirect Care Item Modal) */}";
const targetEnd = "{/* ======================================================== */}\n      {editingSupportItem.isOpen && (";

// Find start of modal comment
const idx1 = content.indexOf(targetStart);
// Find end of editingSupportItem modal
const idx2 = content.lastIndexOf("      )}\n\n    </div>\n  );");

if (idx1 === -1 || idx2 === -1) {
  console.error("Markers not found:", { idx1, idx2 });
  process.exit(1);
}

// Find the start line for targetStart
const commentStart = content.lastIndexOf("      {/* ======================================================== */}", idx1);

const newContent = content.slice(0, commentStart) + replacement + content.slice(idx2);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log("Successfully replaced modals in DataEntryForm.tsx");
